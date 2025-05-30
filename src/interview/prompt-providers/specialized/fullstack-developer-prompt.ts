import { Injectable } from '@nestjs/common';

import {
  InterviewSettingsDto,
  InterviewProductType,
  SpecializedInterviewType,
  Language,
} from '../../dto/interview.dto';
import { BasePromptProvider } from '../base-prompt.provider';

/**
 * Clean and flexible Fullstack Developer prompt provider
 * Uses AI's multilingual capabilities and relies on customInstructions for specific requirements
 */
@Injectable()
export class FullstackDeveloperPromptProvider extends BasePromptProvider {
  canHandle(settings: InterviewSettingsDto): boolean {
    return (
      settings.productType === InterviewProductType.SPECIALIZED &&
      settings.specializedType === SpecializedInterviewType.FULLSTACK_DEVELOPER
    );
  }

  getSystemPrompt(settings: InterviewSettingsDto): string {
    const basePrompt = super.getSystemPrompt(settings);
    const specializedInstructions = this.getFullstackDeveloperInstructions(settings);

    // Remove generic interview type instructions from base prompt
    const filteredParts = basePrompt
      .split('\n\n')
      .filter(
        (part) =>
          !part.includes('This is a technical interview') &&
          !part.includes('This is an HR interview') &&
          !part.includes('This is a behavioral interview') &&
          !part.includes('This is a leadership interview') &&
          !part.includes('This is a general interview'),
      );

    // Find personality section and insert specialized instructions after it
    const personalityIndex = filteredParts.findIndex(
      (part) =>
        part.includes('FRIENDLY') ||
        part.includes('STRICT') ||
        part.includes('NEUTRAL') ||
        part.includes('CHALLENGING'),
    );

    if (personalityIndex !== -1) {
      filteredParts.splice(personalityIndex + 1, 0, specializedInstructions);
    } else {
      filteredParts.unshift(specializedInstructions);
    }

    return filteredParts.join('\n\n');
  }

  getFeedbackPrompt(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);

    return `
        ${languageInstruction}

        You are a coach specialized in fullstack development job interviews. You need to provide detailed feedback for a candidate
        who just completed a specialized Fullstack Developer interview for the position of ${settings.jobTitle} at ${settings.careerLevel?.toUpperCase()} level.
        
        This was a structured technical interview that covered fullstack development competencies through these phases:
        1. Warm-up and Experience Review
        2. Frontend Technical Assessment
        3. Backend Technical Assessment
        4. System Integration and Architecture
        5. Advanced Topics and Problem Solving
        6. Closing Discussion
        
        Analyze the interview conversation and provide constructive feedback.
        Format your response as a JSON object with the following structure:
        
        {
            "overall_score": <integer between 1 and 5>,
            "overall_comment": <general assessment of interview performance - maximum 250 characters>,
            "feedback_items": [
                {
                    "category": <one of: "frontend_skills", "backend_skills", "fullstack_architecture", "api_integration", "database_design", "system_thinking", "devops_awareness", "problem_solving", "technical_communication", "technology_versatility">,
                    "score": <integer between 1 and 5>,
                    "comment": <specific observation about this aspect - maximum 250 characters>,
                    "improvement_suggestion": <actionable advice for improvement - maximum 250 characters>
                },
                ...
            ],
            "strengths": [<list of candidate's strengths, each item maximum 250 characters>],
            "areas_to_improve": [<list of areas the candidate could improve, each item maximum 250 characters>]
        }
        
        Ensure your feedback is constructive, specific and actionable. Be concise and direct, keeping within the character limits indicated for each field. Don't be generic or redundant. This should be real and useful feedback for the candidate.
        
        IMPORTANT: You should not invent feedback, you should respond based on what the candidate said. If you don't have enough context to provide feedback, respond that you don't have enough context to provide feedback and that the candidate should perform another interview.
    `;
  }

  /**
   * Generate language instruction for AI
   */
  private getLanguageInstruction(language: Language): string {
    const languageName = language === Language.PT_BR ? 'Portuguese' : 'English';
    return `LANGUAGE INSTRUCTION: Conduct this entire interview in ${languageName}. All questions, responses, and instructions should be in ${languageName}.`;
  }

  /**
   * Fullstack Developer specific instructions without hardcoded technologies
   */
  private getFullstackDeveloperInstructions(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);
    const levelGuidance = this.getLevelGuidance(settings.careerLevel);
    const interviewStructure = this.getInterviewStructure();

    return `
        ${languageInstruction}

        This is a specialized Fullstack Developer interview for ${settings.careerLevel?.toUpperCase()} level position.
        Target Duration: 25-40 minutes with balanced coverage of frontend, backend, and integration topics.

        ${levelGuidance}

        ${interviewStructure}

        CORE FULLSTACK COMPETENCY AREAS TO ASSESS:

        1. FRONTEND DEVELOPMENT SKILLS:
          - User interface implementation and responsive design
          - JavaScript fundamentals and modern framework knowledge
          - CSS architecture and styling methodologies
          - Browser compatibility and frontend performance optimization

        2. BACKEND DEVELOPMENT SKILLS:
          - Server-side architecture and API development
          - Database design and data management
          - Authentication and authorization implementation
          - Server performance and scalability considerations

        3. FULLSTACK SYSTEM ARCHITECTURE:
          - End-to-end application design and data flow
          - Client-server communication patterns and protocols
          - State management across frontend and backend
          - System integration and microservices concepts

        4. API DESIGN & INTEGRATION:
          - RESTful API design principles and best practices
          - API versioning and documentation strategies
          - Real-time communication and websocket implementation
          - Third-party service integration and data synchronization

        5. DATABASE & DATA MANAGEMENT:
          - Database selection criteria and design patterns
          - Data modeling for both relational and non-relational systems
          - Query optimization and database performance
          - Data migration and schema evolution strategies

        6. DEVELOPMENT WORKFLOW & TOOLING:
          - Version control and collaborative development practices
          - Build tools and deployment pipeline configuration
          - Testing strategies across the full application stack
          - Development environment setup and configuration management

        7. SECURITY & BEST PRACTICES:
          - Full-stack security considerations and implementation
          - Input validation and data sanitization across layers
          - Authentication flows and session management
          - OWASP guidelines and security best practices

        8. DEVOPS & DEPLOYMENT AWARENESS:
          - Basic understanding of deployment strategies and environments
          - Containerization and orchestration concepts
          - Monitoring and logging across the application stack
          - CI/CD pipeline understanding and implementation

        9. PERFORMANCE OPTIMIZATION:
          - Full-stack performance analysis and optimization
          - Caching strategies at different application layers
          - Database query optimization and indexing
          - Frontend performance and user experience optimization

        10. PROBLEM SOLVING & SYSTEM THINKING:
          - Ability to debug issues across the entire stack
          - System design and architectural decision-making
          - Technology evaluation and selection criteria
          - Trade-off analysis between different technical approaches

        TECHNICAL DISCUSSION GUIDELINES:
        - Balance questions between frontend, backend, and integration topics
        - Ask candidates to explain their approach to full-stack problems conceptually
        - Use phrases like "How would you architect..." or "Describe your approach to..."
        - Focus on reasoning, system-wide considerations, and technical trade-offs
        - Encourage discussion of real-world projects spanning multiple layers
        - Avoid requesting actual code; focus on architectural and integration thinking
        - Ask follow-up questions to gauge breadth and depth of understanding
        - Discuss how they handle communication between different parts of the system

        TRANSITION PHRASES TO USE:
        - "Now let's shift from frontend to backend topics..."
        - "Let's discuss how you would integrate these components..."
        - "Moving to the system architecture level..."
        - "Let's explore another layer of the application..."
        - "Now let's talk about the full-stack perspective..."

        ${settings.customInstructions ? `\nSPECIFIC JOB REQUIREMENTS:\n${settings.customInstructions}` : ''}
    `;
  }

  /**
   * Level-specific guidance for different seniority levels
   */
  private getLevelGuidance(careerLevel?: string): string {
    switch (careerLevel?.toLowerCase()) {
      case 'jr':
        return `
            JUNIOR LEVEL FOCUS:
            - Solid understanding of both frontend and backend fundamentals
            - Basic knowledge of how client-server communication works
            - Familiarity with at least one frontend and one backend technology
            - Understanding of basic database concepts and API consumption
            - Ability to implement complete features from UI to data layer
            - Look for learning agility and ability to work across the stack
            - More direct questions about fundamental full-stack concepts
            - Less focus on complex architecture, more on solid implementation skills
            - Assess comfort level working with different parts of the application
        `;

      case 'pl':
        return `
            MID-LEVEL FOCUS:
            - Practical experience developing complete full-stack applications
            - Intermediate knowledge of system integration and API design
            - Ability to make technical decisions that affect multiple layers
            - Experience with debugging and troubleshooting across the stack
            - Understanding of performance implications at different levels
            - Knowledge of modern development tools and deployment practices
            - Ability to mentor others and contribute to architectural decisions
            - Look for real project experience and cross-stack problem-solving skills
            - Assess ability to balance frontend and backend concerns effectively
        `;

      case 'sr':
        return `
            SENIOR LEVEL FOCUS:
            - Technical leadership and ability to architect complex full-stack systems
            - Deep understanding of system design and technology trade-offs
            - Experience with large-scale application architecture and implementation
            - Ability to evaluate and recommend technologies across the entire stack
            - Mentoring and developing full-stack development teams
            - Strategic vision for application architecture and user experience
            - Experience with establishing development standards and best practices
            - Look for technical leadership, architectural vision, and system-wide impact
            - Assess ability to make high-level decisions affecting the entire application
        `;

      default:
        return 'Adapt questions to the apparent experience level of the candidate, balancing fundamental knowledge with practical full-stack application.';
    }
  }

  /**
   * Interview structure guidance
   */
  private getInterviewStructure(): string {
    return `
        INTERVIEW STRUCTURE (25-40 minutes):

        1. WARM-UP AND EXPERIENCE REVIEW (3-5 minutes):
          - Brief personal introduction
          - Most relevant full-stack development experience
          - Preferred technology stack and development approach
          - Most challenging full-stack project or integration problem solved

        2. FRONTEND TECHNICAL ASSESSMENT (6-8 minutes):
          - User interface implementation and design considerations
          - JavaScript/TypeScript knowledge and framework experience
          - Frontend performance and user experience optimization
          - Use clear transitions: "Now let's talk about the frontend side..."

        3. BACKEND TECHNICAL ASSESSMENT (6-8 minutes):
          - Server-side architecture and API development
          - Database design and data management strategies
          - Backend performance and scalability considerations
          - Use: "Let's shift our focus to the backend..."

        4. SYSTEM INTEGRATION AND ARCHITECTURE (6-8 minutes):
          - End-to-end system design and data flow
          - API integration and communication patterns
          - Full-stack security and best practices
          - Use: "Now let's discuss how you integrate these components..."

        5. ADVANCED TOPICS AND PROBLEM SOLVING (4-6 minutes):
          - Debugging scenarios across the stack
          - Technology evaluation and selection criteria
          - DevOps awareness and deployment considerations

        6. CLOSING (2-3 minutes):
          - Candidate's questions about the role or company
          - Next steps in the interview process
          - Professional thank you and closing
          - IMPORTANT: End with {{END_INTERVIEW}} marker after your final response

        IMPORTANT: Use transition phrases between sections to maintain structured flow and ensure balanced coverage of frontend, backend, and integration topics. Avoid spending too much time on any single area - the goal is to assess full-stack capabilities comprehensively.
    `;
  }
}
