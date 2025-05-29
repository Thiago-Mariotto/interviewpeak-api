import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WsResponse,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

import { CreateMessageDto } from './dto/interview.dto';
import { InterviewService } from './interview.service';

@WebSocketGateway({
  namespace: 'api/v1/interviews/ws',
  cors: {
    origin: '*',
    credentials: true,
  },
})
export class InterviewGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(InterviewGateway.name);

  constructor(
    private readonly interviewService: InterviewService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) { }

  async handleConnection(client: Socket): Promise<void> {
    try {
      const interviewId = this.extractInterviewIdFromSocket(client);

      if (!interviewId) {
        this.logger.error('No interview ID provided in the connection URL');
        client.emit('error', { message: 'No interview ID provided' });
        client.disconnect();
        return;
      }

      const token = this.extractTokenFromSocket(client);

      if (!token) {
        this.logger.error('No authentication token provided');
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      let decoded;
      try {
        decoded = this.jwtService.verify(token, {
          secret: this.configService.get<string>('JWT_SECRET'),
        });
      } catch (error) {
        this.logger.error(`Invalid JWT token: ${error.message}`);
        client.emit('error', { message: 'Invalid authentication token' });
        client.disconnect();
        return;
      }

      try {
        const isAdmin = decoded.role === 'admin';
        const session = await this.interviewService.getInterview(interviewId, decoded.sub, isAdmin);

        if (session.status !== 'in_progress') {
          this.logger.error(`Interview is not in progress: ${session.status}`);
          client.emit('error', {
            message: `Interview is not in progress. Current status: ${session.status}`,
          });
          client.disconnect();
          return;
        }

        client.data.userId = decoded.sub;
        client.data.role = decoded.role;
        client.data.interviewId = interviewId;
        client.join(interviewId);

        this.logger.log(`Client connected to interview: ${interviewId} for user: ${decoded.sub}`);
      } catch (error) {
        this.logger.error(`Error on WebSocket connection: ${error.message}`);
        client.emit('error', { message: error.message });
        client.disconnect();
      }
    } catch (error) {
      this.logger.error(`Unexpected error on WebSocket connection: ${error.message}`);
      client.emit('error', { message: 'Server error during connection' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const interviewId = client.data.interviewId || this.extractInterviewIdFromSocket(client);
    if (interviewId) {
      this.logger.log(`Client disconnected from interview: ${interviewId}`);
    } else {
      this.logger.log('Client disconnected');
    }
  }

  @SubscribeMessage('message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: CreateMessageDto,
  ): Promise<WsResponse<any>> {
    const interviewId = client.data.interviewId;
    const userId = client.data.userId;
    const isAdmin = client.data.role === 'admin';

    if (!interviewId || !userId) {
      return { event: 'error', data: { message: 'Authentication or interview ID not found' } };
    }

    try {
      if (!data || !data.content) {
        this.logger.error('Invalid message data received:', data);
        return { event: 'error', data: { message: 'Invalid message content' } };
      }
      const contentPreview = data.content ? data.content.substring(0, 30) : '[empty content]';
      this.logger.log(`Received message from candidate: "${contentPreview}..."`);

      await this.interviewService.createMessage(
        interviewId,
        'candidate',
        data.content,
        userId,
        isAdmin,
      );

      const { stream, messageId } = await this.interviewService.generateResponseStream(
        interviewId,
        data.content,
        userId,
        isAdmin,
      );

      let fullResponse = '';
      const currentTimestamp = new Date();

      let currentBuffer = '';
      const sentenceTerminators = /[.!?]/;
      const clauseTerminators = /[,;:]/;

      const sendBufferIfComplete = (force = false) => {
        if (force || sentenceTerminators.test(currentBuffer)) {
          if (currentBuffer.trim().length > 0) {
            client.emit('response_chunk', {
              content: currentBuffer,
              isComplete: false,
              messageId,
              timestamp: currentTimestamp.toISOString(),
            });
            currentBuffer = '';
          }
          return true;
        }

        if (currentBuffer.length > 150) {
          const lastClauseTerminator = currentBuffer.search(
            new RegExp(`${clauseTerminators.source}[^${clauseTerminators.source}]*$`),
          );

          if (lastClauseTerminator > 50) {
            const sendContent = currentBuffer.substring(0, lastClauseTerminator + 1);
            client.emit('response_chunk', {
              content: sendContent,
              isComplete: false,
              messageId,
              timestamp: currentTimestamp.toISOString(),
            });
            currentBuffer = currentBuffer.substring(lastClauseTerminator + 1);
            return true;
          } else if (currentBuffer.length > 200) {
            client.emit('response_chunk', {
              content: currentBuffer,
              isComplete: false,
              messageId,
              timestamp: currentTimestamp.toISOString(),
            });
            currentBuffer = '';
            return true;
          }
        }

        return false;
      };

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';

        if (content) {
          fullResponse += content;
          currentBuffer += content;

          sendBufferIfComplete();
        }
      }

      if (currentBuffer.length > 0) {
        sendBufferIfComplete(true);
      }

      await this.interviewService.updateMessage(messageId, fullResponse);

      client.emit('response_complete', {
        messageId,
        timestamp: currentTimestamp.toISOString(),
      });

      return {
        event: 'message_processing',
        data: {
          status: 'streaming_complete',
          messageId,
        },
      };
    } catch (error) {
      this.logger.error(`Error processing message: ${error.message}`);
      return { event: 'error', data: { message: error.message } };
    }
  }

  @SubscribeMessage('time_update')
  async handleTimeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { remainingTime: number },
  ): Promise<WsResponse<any>> {
    const interviewId = client.data.interviewId;
    const userId = client.data.userId;
    const isAdmin = client.data.role === 'admin';

    if (!interviewId || !userId) {
      return { event: 'error', data: { message: 'Authentication or interview ID not found' } };
    }

    try {
      if (data.remainingTime % 30000 < 1000) {
        await this.interviewService.updateRemainingTime(
          interviewId,
          data.remainingTime,
          userId,
          isAdmin,
        );
      }

      const THREE_MINUTES_MS = 3 * 60 * 1000;
      if (data.remainingTime <= THREE_MINUTES_MS && data.remainingTime > THREE_MINUTES_MS - 1000) {
        this.logger.log(
          `Interview ${interviewId} time running out: ${data.remainingTime}ms remaining`,
        );

        const session = await this.interviewService.getInterview(interviewId, userId, isAdmin);
        const isFinishing = (session as any).isFinishing === true;

        if (!isFinishing) {
          const finalResponse = await this.interviewService.handleTimeRunningOut(
            interviewId,
            userId,
            isAdmin,
          );

          this.server.to(interviewId).emit('time_running_out', {
            message: finalResponse.content,
            timestamp: finalResponse.timestamp.toISOString(),
          });
        }
      }

      return {
        event: 'time_update_success',
        data: {
          remainingTime: data.remainingTime,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      this.logger.error(`Error updating time: ${error.message}`);
      return { event: 'error', data: { message: error.message } };
    }
  }

  private extractInterviewIdFromSocket(client: Socket): string | null {
    const urlPath = client.handshake.url || '';

    if (client.handshake.query && client.handshake.query.interviewId) {
      return client.handshake.query.interviewId as string;
    }

    const pathParts = urlPath.split('/');
    return pathParts[pathParts.length - 1] || null;
  }

  private extractTokenFromSocket(client: Socket): string | null {
    if (client.handshake.query && client.handshake.query.token) {
      return client.handshake.query.token as string;
    }

    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return null;
  }
}
