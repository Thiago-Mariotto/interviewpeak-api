import { Injectable } from '@nestjs/common';

import {
  InterviewSettingsDto,
  InterviewProductType,
  SpecializedInterviewType,
  Language,
} from '../../dto/interview.dto';
import { BasePromptProvider } from '../base-prompt.provider';

/**
 * Clean and flexible Backend Developer prompt provider
 * Uses AI's multilingual capabilities and relies on customInstructions for specific requirements
 */
@Injectable()
export class BackendDeveloperPromptProvider extends BasePromptProvider {
  canHandle(settings: InterviewSettingsDto): boolean {
    return (
      settings.productType === InterviewProductType.SPECIALIZED &&
      settings.specializedType === SpecializedInterviewType.BACKEND_DEVELOPER
    );
  }

  getSystemPrompt(settings: InterviewSettingsDto): string {
    const basePrompt = super.getSystemPrompt(settings);
    const specializedInstructions = this.getBackendDeveloperInstructions(settings);

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

        You are a coach specialized in backend development job interviews. You need to provide detailed feedback for a candidate
        who just completed a specialized Backend Developer interview for the position of ${settings.jobTitle} at ${settings.careerLevel?.toUpperCase()} level.
        
        This was a structured technical interview that covered backend development competencies through these phases:
        1. Warm-up and Experience Review
        2. Core Technical Competencies  
        3. System Design and Architecture
        4. Advanced Topics and Problem Solving
        5. Closing Discussion
        
        Analyze the interview conversation and provide constructive feedback.
        Format your response as a JSON object with the following structure:
        
        {
            "overall_score": <integer between 1 and 5>,
            "overall_comment": <general assessment of interview performance - maximum 250 characters>,
            "feedback_items": [
                {
                    "category": <one of: "technical_knowledge", "software_architecture", "api_design", "database_expertise", "security_awareness", "scalability_understanding", "problem_solving", "technical_communication">,
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
   * Backend Developer specific instructions without hardcoded technologies
   */
  private getBackendDeveloperInstructions(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);
    const levelGuidance = this.getLevelGuidance(settings.careerLevel);
    const interviewStructure = this.getInterviewStructure();

    return `
        ${languageInstruction}

        This is a specialized Backend Developer interview for ${settings.careerLevel?.toUpperCase()} level position.
        Target Duration: 20-25 minutes with structured progression through topics.

        ${levelGuidance}

        ${interviewStructure}

        CORE BACKEND COMPETENCY AREAS TO ASSESS:

        1. SOFTWARE ARCHITECTURE & DESIGN:
          - Design principles and architectural patterns
          - Code organization and modular design
          - System design and architectural thinking
          - Design pattern knowledge and application

        2. API DEVELOPMENT & INTEGRATION:
          - API design principles and best practices
          - Authentication and authorization mechanisms
          - API documentation and versioning strategies
          - Integration patterns and communication protocols

        3. CLOUD SERVICES & INTEGRATION (PL & SR ONLY):
          - Cloud platform knowledge and integration (AWS, Azure, GCP, etc.)
          - Serverless architecture and event-driven systems
          - Containerization and orchestration
          - Cloud security and compliance

        4. DATABASE MANAGEMENT:
          - Data modeling and database design
          - Query optimization and performance tuning
          - Database scaling strategies and considerations
          - Transaction management and data consistency

        5. SECURITY IMPLEMENTATION:
          - Security best practices and common vulnerabilities
          - Input validation and data sanitization
          - Authentication and session management
          - Encryption and secure communication

        6. PERFORMANCE & SCALABILITY:
          - Caching strategies and performance optimization
          - Load balancing and horizontal scaling
          - Resource optimization and bottleneck identification
          - Monitoring and performance measurement

        7. SYSTEM DESIGN & ARCHITECTURE:
          - High-level system design principles
          - Scalability patterns and trade-offs
          - Fault tolerance and resilience strategies
          - Distributed systems concepts

        TECHNICAL DISCUSSION GUIDELINES:
        - Ask candidates to explain their approach conceptually
        - Use phrases like "How would you design..." or "Describe your approach to..."
        - Focus on reasoning, trade-offs, and decision-making process
        - Encourage discussion of real-world scenarios and past experiences
        - Avoid requesting actual code; focus on architectural thinking
        - Ask follow-up questions to gauge depth of understanding

        TRANSITION PHRASES TO USE:
        - "Now let's move on to discuss..."
        - "Let's shift our focus to..."
        - "I'd like to explore another important area..."
        - "Moving to our next topic..."
        - "Let's talk about a different aspect..."

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
            - Solid programming fundamentals and basic concepts
            - Understanding of basic data structures and algorithms
            - Basic database knowledge and query skills
            - Familiarity with web development concepts
            - Ability to learn and adapt quickly
            - Look for growth potential and willingness to learn
            - More direct questions about fundamental concepts
            - Less focus on complex architecture, more on solid foundations
        `;

      case 'pl':
        return `
            MID-LEVEL FOCUS:
            - Practical experience with backend system development
            - Intermediate knowledge of design patterns
            - Ability to make independent technical decisions
            - Experience with optimization and troubleshooting
            - Understanding of technical trade-offs
            - Knowledge of modern development tools and practices
            - Ability to mentor junior developers
            - Look for real project experience and problem-solving skills
            - Look for cloud services knowledge and integration, just start with the basics
        `;

      case 'sr':
        return `
            SENIOR LEVEL FOCUS:
            - Technical leadership and ability to architect complex systems
            - Deep understanding of architectural patterns and best practices
            - Experience with large-scale system design and implementation
            - Ability to evaluate and recommend technologies
            - Mentoring and developing technical teams
            - Strategic vision and business alignment
            - Experience with code review and establishing standards
            - Look for technical leadership, architectural vision, and project impact
            - Look for cloud services knowledge and integration
        `;

      default:
        return 'Adapt questions to the apparent experience level of the candidate, balancing fundamental knowledge with practical application.';
    }
  }

  /**
   * Interview structure guidance
   */
  private getInterviewStructure(): string {
    return `
        INTERVIEW STRUCTURE (25-40 minutes):

        1. WARM-UP AND EXPERIENCE REVIEW (3-6 minutes):
          - Brief personal introduction
          - Most relevant backend development experience
          - Technologies and frameworks they enjoy working with
          - Most challenging recent project or problem solved

        2. CORE TECHNICAL COMPETENCIES (8-12 minutes):
          - Choose 2-3 main technical areas based on candidate's level and experience
          - Ask progressive questions (concept → application → trade-offs)
          - Use clear transitions: "Now let's talk about..."

        3. SYSTEM DESIGN AND ARCHITECTURE (6-10 minutes):
          - Practical system design scenario or architectural discussion
          - Scalability and performance considerations
          - Security implications and best practices
          - Use: "Let's shift our focus to discuss..."

        4. ADVANCED TOPICS AND PROBLEM SOLVING (3-6 minutes):
          - Troubleshooting scenario or complex problem-solving
          - Discussion about best practices and industry standards
          - Experience with monitoring, debugging, or optimization

        5. CLOSING (2-4 minutes):
          - Candidate's questions about the role or company
          - Next steps in the interview process
          - Professional thank you and closing
          - IMPORTANT: End with {{END_INTERVIEW}} marker after your final response

        IMPORTANT: Use transition phrases between sections to maintain structured flow and ensure natural progression through topics.
    `;
  }
}
