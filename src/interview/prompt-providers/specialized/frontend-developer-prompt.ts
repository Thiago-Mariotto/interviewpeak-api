import { Injectable } from '@nestjs/common';

import {
  InterviewSettingsDto,
  InterviewProductType,
  SpecializedInterviewType,
  Language,
} from '../../dto/interview.dto';
import { BasePromptProvider } from '../base-prompt.provider';

/**
 * Clean and flexible Frontend Developer prompt provider
 * Uses AI's multilingual capabilities and relies on customInstructions for specific requirements
 */
@Injectable()
export class FrontendDeveloperPromptProvider extends BasePromptProvider {
  canHandle(settings: InterviewSettingsDto): boolean {
    return (
      settings.productType === InterviewProductType.SPECIALIZED &&
      settings.specializedType === SpecializedInterviewType.FRONTEND_DEVELOPER
    );
  }

  getSystemPrompt(settings: InterviewSettingsDto): string {
    const basePrompt = super.getSystemPrompt(settings);
    const specializedInstructions = this.getFrontendDeveloperInstructions(settings);

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

        You are a coach specialized in frontend development job interviews. You need to provide detailed feedback for a candidate
        who just completed a specialized Frontend Developer interview for the position of ${settings.jobTitle} at ${settings.careerLevel?.toUpperCase()} level.
        
        This was a structured technical interview that covered frontend development competencies through these phases:
        1. Warm-up and Experience Review
        2. Core Technical Competencies  
        3. UI/UX Implementation and Design
        4. Advanced Topics and Problem Solving
        5. Closing Discussion
        
        Analyze the interview conversation and provide constructive feedback.
        Format your response as a JSON object with the following structure:
        
        {
            "overall_score": <integer between 1 and 5>,
            "overall_comment": <general assessment of interview performance - maximum 250 characters>,
            "feedback_items": [
                {
                    "category": <one of: "fundamentals", "framework_knowledge", "css_styling", "ui_ux_implementation", "web_performance", "accessibility", "frontend_architecture", "problem_solving", "technical_communication">,
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
   * Frontend Developer specific instructions without hardcoded technologies
   */
  private getFrontendDeveloperInstructions(settings: InterviewSettingsDto): string {
    const languageInstruction = this.getLanguageInstruction(settings.language);
    const levelGuidance = this.getLevelGuidance(settings.careerLevel);
    const interviewStructure = this.getInterviewStructure();

    return `
        ${languageInstruction}

        This is a specialized Frontend Developer interview for ${settings.careerLevel?.toUpperCase()} level position.
        Target Duration: 30-35 minutes with structured progression through topics.

        ${levelGuidance}

        ${interviewStructure}

        CORE FRONTEND COMPETENCY AREAS TO ASSESS:

        1. LANGUAGE FUNDAMENTALS:
          - Core concepts and modern language features
          - Asynchronous programming and event handling
          - DOM manipulation and browser APIs
          - Memory management and performance considerations

        2. FRONTEND FRAMEWORKS & LIBRARIES:
          - Component-based architecture and lifecycle management
          - State management patterns and data flow
          - Routing and navigation implementation
          - Testing strategies for frontend applications

        3. CSS & STYLING ARCHITECTURE:
          - CSS methodologies and organization strategies
          - Responsive design and mobile-first approaches
          - CSS preprocessors and modern styling solutions
          - Animation and transition implementation

        4. UI/UX IMPLEMENTATION:
          - Design system implementation and component libraries
          - Cross-browser compatibility and progressive enhancement
          - User interaction patterns and feedback mechanisms
          - Visual design principles and layout techniques

        5. WEB PERFORMANCE OPTIMIZATION:
          - Bundle optimization and code splitting strategies
          - Loading performance and resource management
          - Runtime performance and rendering optimization
          - Core Web Vitals and performance measurement

        6. ACCESSIBILITY & STANDARDS:
          - Web accessibility standards and implementation
          - Semantic HTML and screen reader compatibility
          - Keyboard navigation and focus management
          - WCAG guidelines and inclusive design principles

        7. FRONTEND ARCHITECTURE & TOOLING:
          - Build tools and development workflow
          - Module systems and dependency management
          - Code organization and architectural patterns
          - Version control and deployment strategies

        8. BROWSER COMPATIBILITY & DEBUGGING:
          - Cross-browser development and testing
          - Browser developer tools and debugging techniques
          - Error handling and monitoring strategies
          - Progressive web app concepts and implementation

        TECHNICAL DISCUSSION GUIDELINES:
        - Ask candidates to explain their approach to UI problems conceptually
        - Use phrases like "How would you implement..." or "Describe your approach to..."
        - Focus on reasoning, user experience considerations, and technical trade-offs
        - Encourage discussion of real-world projects and user-facing challenges
        - Avoid requesting actual code; focus on architectural and design thinking
        - Ask follow-up questions to gauge depth of understanding
        - Discuss responsive design and cross-device considerations

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
            - Solid HTML, CSS, and fundamentals
            - Understanding of basic responsive design principles
            - Familiarity with at least one modern frontend framework
            - Basic understanding of version control and development tools
            - Ability to implement designs and handle basic user interactions
            - Look for growth potential and eagerness to learn
            - More direct questions about fundamental web concepts
            - Less focus on complex architecture, more on solid implementation skills
        `;

      case 'pl':
        return `
            MID-LEVEL FOCUS:
            - Practical experience with complex frontend application development
            - Intermediate knowledge of performance optimization techniques
            - Ability to make independent decisions about UI/UX implementation
            - Experience with testing and debugging frontend applications
            - Understanding of accessibility and cross-browser compatibility
            - Knowledge of modern development tools and build processes
            - Ability to mentor junior developers and review code
            - Look for real project experience and problem-solving skills
        `;

      case 'sr':
        return `
            SENIOR LEVEL FOCUS:
            - Technical leadership and ability to architect complex frontend systems
            - Deep understanding of performance optimization and user experience
            - Experience with large-scale frontend application design and implementation
            - Ability to evaluate and recommend frontend technologies and patterns
            - Mentoring and developing frontend teams
            - Strategic vision for user experience and technical architecture
            - Experience with establishing frontend standards and best practices
            - Look for technical leadership, architectural vision, and project impact
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

        1. WARM-UP AND EXPERIENCE REVIEW (3-9 minutes):
          - Brief personal introduction
          - Most relevant frontend development experience
          - Favorite technologies and tools they enjoy working with
          - Most challenging UI/UX problem or project they've worked on

        2. CORE TECHNICAL COMPETENCIES (8-12 minutes):
          - Choose 2-3 main technical areas based on candidate's level and experience
          - Ask progressive questions (concept → application → trade-offs)
          - Focus on JavaScript fundamentals and framework knowledge
          - Use clear transitions: "Now let's talk about..."

        3. UI/UX IMPLEMENTATION AND DESIGN (6-10 minutes):
          - Practical UI implementation scenarios or design challenges
          - Responsive design and cross-device considerations
          - Accessibility and user experience best practices
          - Use: "Let's shift our focus to discuss..."

        4. ADVANCED TOPICS AND PROBLEM SOLVING (4-8 minutes):
          - Performance optimization scenarios or debugging challenges
          - Discussion about modern frontend practices and industry standards
          - Experience with testing, monitoring, or cross-browser compatibility

        5. CLOSING (2-4 minutes):
          - Candidate's questions about the role or company
          - Next steps in the interview process
          - Professional thank you and closing
          - IMPORTANT: End with {{END_INTERVIEW}} marker after your final response


        IMPORTANT: Use transition phrases between sections to maintain structured flow and ensure natural progression through topics.
    `;
  }
}
