/* eslint-disable @typescript-eslint/naming-convention */
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sgClient from '@sendgrid/client';
import sgMail, { MailDataRequired } from '@sendgrid/mail';
import nodemailer from 'nodemailer';

import { IEmail } from './interfaces/email.interface';
import { ISendgridParam } from './interfaces/sendgrid.param.interface';

@Injectable()
export class SendgridService {
  static readonly ASM_GROUP_ID: number = 26367;
  private nodeEnv: string;
  private isProd: boolean;

  private readonly DEFAULT_FROM_EMAIL: string;
  private readonly DEFAULT_FROM_NAME: string;
  private readonly loggerService = new Logger(SendgridService.name);

  constructor(private readonly configService: ConfigService) {
    sgMail.setApiKey(this.configService.getOrThrow('SENDGRID_API_KEY'));
    sgClient.setApiKey(this.configService.getOrThrow('SENDGRID_API_KEY'));
    this.nodeEnv = this.configService.getOrThrow('NODE_ENV');
    this.isProd = this.configService.getOrThrow('IS_PRODUCTION') === 'true';
    this.DEFAULT_FROM_EMAIL = 'noreply@interviewpeak.com';
    this.DEFAULT_FROM_NAME = 'InterviewPeak';
  }

  async sendWithTemplate(
    templateId: string,
    to: string,
    data?: Record<string, any>,
    prodOnly = false,
  ) {
    try {
      if (this.shouldSendEmail(prodOnly)) {
        return await this.sendEmailWithTemplate(templateId, to, data);
      }

      return;
    } catch (err: any) {
      this.loggerService.error(err, 'SendgridService.sendWithTemplate');
      return null;
    }
  }

  protected async sendEmailWithTemplate(
    templateId: string,
    to: string,
    data?: Record<string, any>,
  ) {
    return await sgMail.send({
      to: to,
      from: data?.from || this.DEFAULT_FROM_EMAIL,
      templateId,
      dynamicTemplateData: data || {},
      asm: {
        groupId: SendgridService.ASM_GROUP_ID,
      },
      subject: data?.subject || 'InterviewPeak',
    });
  }

  // Método auxiliar para formatar objetos para log de forma segura
  private safeStringify(obj: any): string {
    try {
      const cache = new Set();
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular Reference]';
          }
          cache.add(value);
        }
        return value;
      });
    } catch (err) {
      return '[Object não serializável]';
    }
  }

  private shouldSendEmail(prodOnly: boolean): boolean {
    return (prodOnly && this.isProd) || (!prodOnly && this.nodeEnv === 'production');
  }

  async send(e: IEmail, params: ISendgridParam, prodOnly = false): Promise<any> {
    try {
      if (this.shouldSendEmail(prodOnly)) {
        this.loggerService.log('Sending production email');
        return await this.sendEmail(e, params);
      }

      this.loggerService.log('Sending test email');
      return await this.sendTestEmail(e, params);
    } catch (err: any) {
      this.loggerService.error(err, 'SendgridService.send');
      throw new InternalServerErrorException('Error sending development email');
    }
  }

  protected async sendTestEmail(e: IEmail, params: ISendgridParam) {
    const testAccount = await nodemailer.createTestAccount();
    this.loggerService.log(`email: ${this.safeStringify(e)}`);
    const request: any = {
      method: 'GET',
      url: `/v3/templates/${e.template}`,
    };

    this.loggerService.log(`sending email ${e.template}`);
    this.loggerService.log(`test account: ${testAccount.user} ${testAccount.pass}`);
    const testSgClient = await sgClient
      .request(request)
      .catch((err) => console.log(JSON.stringify(err, null, 2)));

    // Verificar se testSgClient existe e tem a propriedade necessária
    if (!testSgClient) {
      this.loggerService.error('Falha ao obter template do SendGrid');
      throw new Error('Falha ao obter template do SendGrid');
    }

    const body: any = testSgClient[0]?.body;
    const version = body?.versions?.find((v: any) => v.active === 1) ?? body?.versions?.[0];
    let html = version?.html_content || '';

    html = html
      .replace(/{{{body}}}/g, e.body)
      .replace(/{{{content}}}/g, e.body)
      .replace(/{{{title}}}/g, e.title)
      .replace(/{{{buttonText}}}/g, e.cta)
      .replace(/{{{buttonUrl}}}/g, e.url);

    this.loggerService.log('creating transporter with ethereal account');
    const transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });

    this.loggerService.log('transporter created successfully');

    this.loggerService.log(
      `sending email to ${Array.isArray(params.to) ? params.to.join(', ') : params.to}`,
    );
    const info = await transporter.sendMail({
      from: e.from || this.DEFAULT_FROM_EMAIL,
      to: params.to,
      subject: e.subject,
      attachments: params.attachments,
      html,
    });

    // Preview only available when sending through an Ethereal account
    const previewUrl = nodemailer.getTestMessageUrl(info);
    this.loggerService.log(`dev:previewUrl: ${previewUrl}`);
    return;
  }

  // Send production email
  protected async sendEmail(
    e: {
      template: string;
      subject: string;
      title: string;
      body: string;
      cta?: string;
      url?: string;
      afterButtonContent?: string;
      from?: string;
    },
    params: ISendgridParam,
  ) {
    const email: MailDataRequired = {
      to: params.to,
      from: {
        email: params.from || e.from || this.DEFAULT_FROM_EMAIL,
        name: this.DEFAULT_FROM_NAME,
      },
      templateId: e.template,
      subject: e.subject,
      attachments: params.attachments || [],
      asm: {
        groupId: SendgridService.ASM_GROUP_ID,
      },
      dynamicTemplateData: {
        subject: e.subject,
        title: e.title,
        body: e.body,
        buttonText: e.cta,
        buttonUrl: e.url,
        afterButtonContent: e.afterButtonContent,
      },
    };

    return await sgMail.send(email);
  }
}
