import { Injectable } from '@nestjs/common';

import { BasePromptProvider } from './base-prompt.provider';
import {
  InterviewSettingsDto,
  InterviewProductType,
  Language,
  SpecializedInterviewType,
  InterviewType,
} from '../dto/interview.dto';

/**
 * Clean and flexible specialized provider for all technical interviews
 * Uses AI's multilingual capabilities and relies on customInstructions for specific requirements
 */
@Injectable()
export class SpecializedTechnicalPromptProvider extends BasePromptProvider {
  canHandle(settings: InterviewSettingsDto): boolean {
    return (
      settings.productType === InterviewProductType.SPECIALIZED &&
      settings.specializedType !== undefined &&
      settings.specializedType !== SpecializedInterviewType.BACKEND_DEVELOPER // Backend has its own provider
    );
  }

  getSystemPrompt(settings: InterviewSettingsDto): string {
    // Ensure it's a technical interview
    const modifiedSettings = {
      ...settings,
      interviewType: InterviewType.TECHNICAL,
    };

    // Get the base prompt (already includes technical instructions)
    const basePrompt = super.getSystemPrompt(modifiedSettings);

    // Add specialization-specific instructions
    const specializationInstructions = this.getSpecializationInstructions(settings);

    // Combine prompts
    return this.combinePrompts(basePrompt, specializationInstructions);
  }

  getFeedbackPrompt(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);
    const specializationName = this.getSpecializationName(settings.specializedType);

    return `
        ${languageInstruction}

        You are a coach specialized in ${specializationName} technical interviews. 
        You need to provide detailed feedback for a candidate who just completed a 
        specialized technical interview for the position of ${settings.jobTitle} at ${settings.careerLevel?.toUpperCase()} level.
        
        This was a structured technical interview that followed these phases:
        1. Warm-up and Experience Review
        2. Core Technical Competencies
        3. Practical Application and Problem Solving
        4. Advanced Topics and System Thinking
        5. Closing Discussion

        Analyze the interview conversation and provide constructive feedback.
        Format your response as a JSON object with the following structure:
        {
            "overall_score": <integer between 1 and 5>,
            "overall_comment": <general assessment of interview performance - maximum 300 characters>,
            "feedback_items": [
                {
                    "category": <one of: "technical_knowledge", "practical_experience", "problem_solving", "communication", "system_thinking", "best_practices">,
                    "score": <integer between 1 and 5>,
                    "comment": <specific observation about this aspect - maximum 300 characters>,
                    "improvement_suggestion": <actionable advice for improvement - maximum 300 characters>
                },
                ...
            ],
            "strengths": [<list of candidate's strengths, each item maximum 300 characters>],
            "areas_to_improve": [<list of areas the candidate could improve, each item maximum 300 characters>]
        }
        
        Ensure your feedback is constructive, specific and actionable. Be concise and direct, keeping within the character limits indicated for each field. Don't be generic or redundant. This should be real and useful feedback for the candidate.
        IMPORTANT: You should not invent feedback, you should respond based on what the candidate said. If you don't have enough context to provide feedback, respond that you don't have enough context to provide feedback and that the candidate should perform another interview.
    `;
  }

  /**
   * Returns clean specialization-specific instructions
   */
  private getSpecializationInstructions(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);
    const specializationName = this.getSpecializationName(settings.specializedType);
    const levelGuidance = this.getLevelGuidance(settings.careerLevel);
    const interviewStructure = this.getInterviewStructure();

    return `
        ${languageInstruction}

        This is a specialized ${specializationName} interview for ${settings.careerLevel?.toUpperCase()} level.
        Target Duration: 20-25 minutes with structured progression.

        ${levelGuidance}

        ${interviewStructure}

        ${this.getSpecializationFocus(settings.specializedType)}

        TECHNICAL DISCUSSION GUIDELINES:
        - Ask candidates to explain their approach conceptually
        - Use phrases like "How would you design..." or "Describe your approach to..."
        - Focus on reasoning, trade-offs, and decision-making process
        - Encourage discussion of real-world scenarios and past experiences
        - Avoid requesting actual code; focus on architectural thinking
        - Ask follow-up questions to gauge depth of understanding

        TRANSITION PHRASES TO USE:
        - "Now let's talk about..."
        - "Let's shift our focus to discuss..."
        - "I'd like to explore another important area..."
        - "Moving to our next topic..."
        - "Let's address a different aspect..."

        ${settings.customInstructions ? `\nSPECIFIC REQUIREMENTS:\n${settings.customInstructions}` : ''}
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
   * Get human-readable specialization name
   */
  private getSpecializationName(specializedType: SpecializedInterviewType): string {
    const names = {
      [SpecializedInterviewType.FRONTEND_DEVELOPER]: 'Frontend Developer',
      [SpecializedInterviewType.FULLSTACK_DEVELOPER]: 'Fullstack Developer',
      [SpecializedInterviewType.MOBILE_DEVELOPER]: 'Mobile Developer',
      [SpecializedInterviewType.DEVOPS_ENGINEER]: 'DevOps Engineer',
      [SpecializedInterviewType.DATA_SCIENTIST]: 'Data Scientist',
      [SpecializedInterviewType.CLOUD_ARCHITECT]: 'Cloud Architect',
      [SpecializedInterviewType.QA_ENGINEER]: 'QA Engineer',
      [SpecializedInterviewType.UX_UI_DESIGNER]: 'UX/UI Designer',
      [SpecializedInterviewType.PRODUCT_MANAGER]: 'Product Manager',
    };
    return names[specializedType] || specializedType.replace(/_/g, ' ');
  }

  /**
   * Level-specific guidance for different seniority levels
   */
  private getLevelGuidance(careerLevel?: string): string {
    switch (careerLevel?.toLowerCase()) {
      case 'jr':
        return `
            JUNIOR LEVEL FOCUS:
            - Solid fundamentals and basic concepts
            - Willingness to learn and adapt
            - Theoretical knowledge and initial experience
            - Ability to follow guidance and work in teams
            - More direct questions about fundamental concepts
            - Look for growth potential and learning attitude
        `;

      case 'pl':
        return `
            MID-LEVEL FOCUS:
            - Practical experience with real projects
            - Ability to make independent technical decisions
            - Knowledge of trade-offs and best practices
            - Experience with troubleshooting and optimization
            - Ability to mentor junior developers
            - Balance between guidance and autonomy
        `;

      case 'sr':
        return `
            SENIOR LEVEL FOCUS:
            - Technical leadership and architectural vision
            - Experience with complex and large-scale systems
            - Ability to evaluate and recommend technologies
            - Mentoring and team development capabilities
            - Strategic vision and business alignment
            - Innovation and process improvement initiatives
        `;

      default:
        return `
            GENERAL FOCUS:
            - Adapt questions to the apparent experience level of the candidate
            - Assess both technical knowledge and practical application
            - Look for problem-solving approach and communication skills
        `;
    }
  }

  /**
   * Interview structure guidance
   */
  private getInterviewStructure(): string {
    return `
        INTERVIEW STRUCTURE (20-25 minutes):
        
        1. WARM-UP AND EXPERIENCE (3-6 min):
           - Brief personal introduction
           - Most relevant experience discussion
           - Current technology preferences
           - Most challenging recent project

        2. CORE TECHNICAL COMPETENCIES (8-12 min):
           - Choose 2-3 main technical areas based on the role
           - Ask progressive questions (concept → application → trade-offs)
           - Use clear transitions between topics

        3. PRACTICAL APPLICATION AND PROBLEM SOLVING (6-10 min):
           - Real-world scenarios and case studies
           - System design or architectural discussions
           - Problem-solving approach evaluation

        4. ADVANCED TOPICS AND SYSTEM THINKING (3-6 min):
           - Advanced concepts for the specialization
           - Best practices and industry standards
           - Scalability and performance considerations

        5. CLOSING (2-4 min):
           - Candidate questions
           - Next steps in the process
           - Professional courtesy closing

        IMPORTANT: Use transition phrases between sections to maintain structured flow.
    `;
  }

  /**
   * Get specialization focus areas without hardcoded technologies
   */
  private getSpecializationFocus(specializedType: SpecializedInterviewType): string {
    const focuses = {
      [SpecializedInterviewType.FRONTEND_DEVELOPER]: `
        FRONTEND DEVELOPER FOCUS AREAS:
        - Modern frontend frameworks and libraries
        - JavaScript/TypeScript expertise 
        - CSS and responsive design principles
        - Build tools and development workflow
        - Web performance optimization techniques
        - User experience and interface design collaboration
      `,

      [SpecializedInterviewType.FULLSTACK_DEVELOPER]: `
        FULLSTACK DEVELOPER FOCUS AREAS:
        - Frontend and backend integration
        - Full-stack architecture patterns
        - Database design and management
        - API design and implementation
        - DevOps and deployment processes
        - End-to-end system thinking
      `,

      [SpecializedInterviewType.MOBILE_DEVELOPER]: `
        MOBILE DEVELOPER FOCUS AREAS:
        - Mobile platform development approaches
        - Mobile architecture patterns and best practices
        - Performance optimization and memory management
        - Device capabilities and native integrations
        - App store deployment and distribution
        - Cross-platform vs native considerations
      `,

      [SpecializedInterviewType.DEVOPS_ENGINEER]: `
        DEVOPS ENGINEER FOCUS AREAS:
        - Infrastructure automation and management
        - CI/CD pipeline design and implementation
        - Containerization and orchestration
        - Cloud platforms and services
        - Monitoring, logging, and observability
        - Security and compliance practices
      `,

      [SpecializedInterviewType.DATA_SCIENTIST]: `
        DATA SCIENTIST FOCUS AREAS:
        - Statistical analysis and mathematical foundations
        - Machine learning algorithms and applications
        - Data processing and ETL pipelines
        - Data visualization and communication
        - Big data technologies and cloud platforms
        - Business intelligence and metrics interpretation
      `,

      [SpecializedInterviewType.CLOUD_ARCHITECT]: `
        CLOUD ARCHITECT FOCUS AREAS:
        - Cloud platform services and capabilities
        - Infrastructure design and scalability
        - Security frameworks and compliance
        - Cost optimization strategies
        - Migration and modernization approaches
        - Multi-cloud and hybrid architectures
      `,

      [SpecializedInterviewType.QA_ENGINEER]: `
        QA ENGINEER FOCUS AREAS:
        - Testing methodologies and strategies
        - Test automation frameworks and tools
        - Performance and security testing
        - Quality processes and metrics
        - CI/CD integration and testing
        - Risk assessment and management
      `,

      [SpecializedInterviewType.UX_UI_DESIGNER]: `
        UX/UI DESIGNER FOCUS AREAS:
        - User experience research and design principles
        - User interface design and prototyping
        - Design systems and component libraries
        - Usability testing and user feedback
        - Collaboration with development teams
        - Accessibility and inclusive design
      `,

      [SpecializedInterviewType.PRODUCT_MANAGER]: `
        PRODUCT MANAGER FOCUS AREAS:
        - Product strategy and roadmap planning
        - Market research and user needs analysis
        - Cross-functional team collaboration
        - Data-driven decision making
        - Product lifecycle management
        - Stakeholder communication and alignment
      `,
    };

    return (
      focuses[specializedType] ||
      `
        SPECIALIZED FOCUS AREAS:
        - Core competencies specific to this role
        - Industry best practices and standards
        - Problem-solving and analytical thinking
        - Technical knowledge and practical application
        - Communication and collaboration skills
        - Innovation and continuous learning approach
    `
    );
  }

  private combinePrompts(basePrompt: string, specializationInstructions: string): string {
    return `${basePrompt}\n\n--- SPECIALIZATION-SPECIFIC INSTRUCTIONS ---\n${specializationInstructions}`;
  }
}
