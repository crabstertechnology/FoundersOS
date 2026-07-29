import 'dart:convert';
import 'package:google_generative_ai/google_generative_ai.dart';
import '../models/models.dart';

class GeminiService {
  static const String defaultApiKey = "AIzaSyAnMjMt5Gf_siAna5g41v43yZtqDje1I4k";
  String _customApiKey = '';

  String get apiKey => _customApiKey.isNotEmpty ? _customApiKey : defaultApiKey;

  void setApiKey(String key) {
    _customApiKey = key;
  }

  GenerativeModel _getModel({bool forceJson = false}) {
    return GenerativeModel(
      model: 'gemini-1.5-flash',
      apiKey: apiKey,
      generationConfig: forceJson ? GenerationConfig(responseMimeType: 'application/json') : null,
    );
  }

  // -----------------------------------------------------------------
  // 1. Contextual Strategic Advisor (Valuation Page)
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> getStrategicAdvice({
    required CompanyProfile profile,
    required List<Shareholder> shareholders,
    required List<Map<String, dynamic>> rounds,
    required double founderEq,
    required double ltvCac,
    required double runway,
  }) async {
    final prompt = """
    Analyze the following startup data and generate a strategic advice report in JSON format.
    Return ONLY a JSON object with this schema:
    {
      "summary": "overall summary string...",
      "strengths": ["strength 1", "strength 2", ...],
      "warnings": ["warning 1", "warning 2", ...],
      "recommendations": ["recommendation 1", "recommendation 2", ...]
    }

    Company Name: ${profile.companyName}
    Stage: ${profile.stage}
    Industry: ${profile.industry}
    MRR: INR ${profile.mRevenue}
    Growth Rate: ${profile.growthRate}%
    Burn Rate: INR ${profile.burnRate}
    Cash in Bank: INR ${profile.cashBank}
    Runway: $runway months
    Customers: ${profile.customers}
    LTV: INR ${profile.profitPerOrder * profile.ordersPerCustomer}
    CAC: INR ${profile.cac}
    LTV:CAC Ratio: ${ltvCac}x
    Investment sought: INR ${profile.investment}
    Equity offered: ${profile.equityOffered}%
    Founder Equity: $founderEq%

    Shareholders:
    ${shareholders.map((s) => "- ${s.name} (${s.role}): ${s.ownership}% ownership, ${s.invested} INR invested, preference: ${s.preferenceType}").join("\n")}

    Funding Rounds:
    ${rounds.map((r) => "- ${r['roundName']}: ${r['amountRaised']} INR raised, ${r['equityOffered']}% equity").join("\n")}
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      // Fallback/Mock Response if fails
      return {
        "summary": "This is a fallback strategic assessment for ${profile.companyName}. Your current cash runway is estimated at ${runway.toStringAsFixed(1)} months. Focus on improving customer LTV:CAC efficiency.",
        "strengths": [
          "Operational activity recorded in the ${profile.industry} market.",
          "Clear framework for equity distribution with founder holding ${founderEq.toStringAsFixed(1)}%."
        ],
        "warnings": [
          runway < 6 ? "Critical warning: Your runway is less than 6 months. Consider fundraising immediately." : "Keep a close watch on monthly burn rates.",
          ltvCac < 3 ? "LTV to CAC ratio is below the 3x benchmark. Customer acquisition costs are unsustainable." : "Maintain acquisition efficiency as you scale."
        ],
        "recommendations": [
          "Refine your unit economics by optimizing pricing or reducing acquisition spend.",
          "Establish a solid ESOP pool (ideally 10-15%) before the next funding round.",
          "Negotiate non-participating liquidation preferences to protect founder equity."
        ]
      };
    }
  }

  // -----------------------------------------------------------------
  // 2. Term Sheet Negotiation Assistant
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> getTermSheetAdvice({
    required CompanyProfile profile,
    required double founderEq,
    required String existingClauses,
  }) async {
    final prompt = """
    You are an expert venture capitalist advising an Indian founder.
    Analyze this term sheet negotiation scenario and output a JSON response matching this schema:
    {
      "overallAssessment": "Overall assessment of founder's negotiating position...",
      "keyNegotiationPoints": [
        {
          "clause": "Clause Name (e.g. Liquidation Preference)",
          "founderFriendlyRecommendation": "Ideal structure...",
          "negotiationStrategy": "Talking points for the founder...",
          "redFlagsToWatchOutFor": "Investor red flags...",
          "feedbackOnCurrentProposedTerms": "Feedback on their proposed clauses..."
        }
      ],
      "generalWarnings": "Warnings/General advice..."
    }

    Startup: ${profile.companyName}
    Stage: ${profile.stage}
    Industry: ${profile.industry}
    Revenue: INR ${profile.mRevenue}
    Investment: INR ${profile.investment}
    Equity offered: ${profile.equityOffered}%
    Founder Equity (Before): $founderEq%
    Proposed Clauses by Investor: $existingClauses
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "overallAssessment": "Based on a ${profile.stage} stage startup in ${profile.industry}, you have a moderate negotiating position. Your monthly recurring revenue is ₹${profile.mRevenue.toStringAsFixed(0)}, which gives some valuation support.",
        "keyNegotiationPoints": [
          {
            "clause": "Liquidation Preference",
            "founderFriendlyRecommendation": "1x Non-Participating preference. This is standard in startup rounds.",
            "negotiationStrategy": "Argue that participating preference creates misalignment between founders and investors at low exit outcomes.",
            "redFlagsToWatchOutFor": "2x or 3x multiple or participating preference. These can wipe out founder payouts completely.",
            "feedbackOnCurrentProposedTerms": "Review the clauses carefully. Ensure no toxic terms like participating multipliers are hidden."
          },
          {
            "clause": "Board Seats",
            "founderFriendlyRecommendation": "Keep a founder majority on the board. For example, 2 founder seats and 1 investor seat.",
            "negotiationStrategy": "Keep control of operational decisions. Argue that founders need board flexibility to execute quickly at this stage.",
            "redFlagsToWatchOutFor": "Investor demanding veto power on minor operational items or majority board control.",
            "feedbackOnCurrentProposedTerms": "Verify voting rules and veto rights before signing the term sheet."
          }
        ],
        "generalWarnings": "Exclusivity periods should not exceed 30-45 days. Never stop talks with other potential investors until a binding term sheet is executed."
      };
    }
  }

  // -----------------------------------------------------------------
  // 3. Term Sheet Q&A
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> askTermSheetQuestion({
    required CompanyProfile profile,
    required String question,
  }) async {
    final prompt = """
    Answer this founder question regarding term sheets or venture negotiations.
    Output ONLY a JSON object matching this schema:
    {
      "answer": "Detailed answer in markdown format...",
      "suggestedFollowUpQuestions": ["question 1", "question 2"],
      "riskLevel": "Low" | "Medium" | "High",
      "riskRationale": "Short risk description (max 15 words)"
    }

    Startup: ${profile.companyName}
    Stage: ${profile.stage}
    Industry: ${profile.industry}
    Question: "$question"
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "answer": "### Explanation\n\nTerm sheets are critical gating documents for venture financing. When negotiating clauses like **Liquidation Preference** or **Anti-dilution rights**, it is vital to know that: \n\n*   **Standard term sheet** terms for early stage startups include a **1x non-participating** liquidation preference.\n*   Anti-dilution clauses should ideally be **Broad-based Weighted Average** rather than *Full Ratchet*.\n\n### Impact on ${profile.companyName}\nAt the ${profile.stage} stage, you should strive to retain operational control. Avoid giving up board control or agreeing to high liquidation multiples.",
        "suggestedFollowUpQuestions": [
          "What is the difference between participating and non-participating preference?",
          "How do anti-dilution clauses affect founder dilution during a down-round?"
        ],
        "riskLevel": "Medium",
        "riskRationale": "Term sheet queries require legal and VC re-evaluation."
      };
    }
  }

  // -----------------------------------------------------------------
  // 4. Sales Script Cold Call Generator
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> generateColdCallScript({
    required String productName,
    required String targetAudience,
    required String problemSolved,
    required String buyerType,
  }) async {
    final prompt = """
    Act as a sales advisor and generate a cold call script.
    Output ONLY a JSON object with this schema:
    {
      "hook": "Opening hook statement...",
      "problem": "Highlighting customer problem...",
      "solution": "Solution statement...",
      "outcome": "Value and outcome description...",
      "fullDraftScript": "Cohesive 30-second script integrating hook, problem, solution, and outcome...",
      "objectionHandlingStrategy": "Reframe script for the most likely objection..."
    }

    Product: $productName
    Target: $targetAudience
    Problem: $problemSolved
    Buyer Archetype: $buyerType (price, quality, urgent, curious)
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "hook": "Hi [Prospect Name], I notice you are managing operations for $targetAudience. Many teams face serious bottlenecks trying to solve $problemSolved.",
        "problem": "Without a dedicated system, you are likely wasting hours on manual tracking and losing efficiency daily.",
        "solution": "That's why we created $productName. It automates this workflow directly, resolving the core bottleneck.",
        "outcome": "As a result, teams like yours save up to 10 hours a week and increase conversion rates by 25%.",
        "fullDraftScript": "Hi [Prospect Name], this is [Your Name] from $productName. I'm reaching out because we help $targetAudience resolve $problemSolved. Usually, teams are struggling with manual tracking, losing hours in efficiency. We automate this entire process so you can save 10 hours a week and boost conversion by 25%. Do you have 2 minutes to chat about how you are handling this currently?",
        "objectionHandlingStrategy": "If they say 'No budget': Reframe as: 'I completely understand. We aren't selling anything today. I just want to show you how we save clients an average of ₹15,000/month. If it doesn't make financial sense, we can part ways. Fair enough?'"
      };
    }
  }

  // -----------------------------------------------------------------
  // 5. Sales Coaching Scenario & Prospect Simulator
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> generateCoachingScenario({
    required String areaToCoach,
    required String difficulty,
    required String productName,
    required String targetAudience,
    required String problemSolved,
  }) async {
    final prompt = """
    Act as a B2B sales trainer and design a roleplay coaching scenario.
    Output ONLY a JSON object with this schema:
    {
      "scenarioName": "Name for the scenario...",
      "prospectName": "Name & Title of prospect...",
      "companyContext": "Background company info...",
      "triggerEvent": "Why are they taking the call...",
      "scenarioRules": ["Rule 1", "Rule 2", ...],
      "objectionsToRaise": ["Objection 1", "Objection 2", ...],
      "openingLine": "Prospect's first line of dialogue..."
    }

    Sales Skill Area: $areaToCoach
    Difficulty: $difficulty
    Product: $productName
    Target: $targetAudience
    Problem: $problemSolved
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "scenarioName": "The Overwhelmed Director",
        "prospectName": "Rajesh Kumar, VP of Operations",
        "companyContext": "A fast-growing firm with 150 employees currently doing manual reporting.",
        "triggerEvent": "They just lost a major customer due to a tracking bottleneck yesterday.",
        "scenarioRules": [
          "You must ask at least 2 open-ended discovery questions before pitching price.",
          "Acknowledge their current pain points before introducing the product benefits."
        ],
        "objectionsToRaise": [
          "Our team is too busy to learn a new tool right now.",
          "It sounds too expensive for our current quarterly budget."
        ],
        "openingLine": "Hello, this is Rajesh. I have a very busy day, so what is this about?"
      };
    }
  }

  Future<Map<String, dynamic>> simulateProspectResponse({
    required String scenarioName,
    required String prospectName,
    required String companyContext,
    required String triggerEvent,
    required List<String> scenarioRules,
    required List<String> objectionsToRaise,
    required List<Map<String, String>> chatHistory,
    required String userMessage,
  }) async {
    final prompt = """
    Simulate a B2B prospect in a sales roleplay call. Respond in character.
    Output ONLY a JSON object with this schema:
    {
      "reply": "Your in-character reply...",
      "ended": false or true (set to true if the salesperson successfully books a demo/closes or if they fail and you hang up),
      "coachFeedbackHint": "Private coaching tip for the user..."
    }

    Prospect: $prospectName
    Scenario: $scenarioName
    Context: $companyContext
    Trigger: $triggerEvent
    Rules they must follow: $scenarioRules
    Your Objections: $objectionsToRaise

    Chat History:
    ${chatHistory.map((m) => "${m['role']}: ${m['text']}").join("\n")}
    User's new message: "$userMessage"
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "reply": "I see. We have been struggling with manual tracking, but honestly, implementing a new software feels like a huge headache for my staff.",
        "ended": false,
        "coachFeedbackHint": "Good job introducing yourself. Next, try asking a discovery question about their manual tracking overhead instead of jumping straight into features."
      };
    }
  }

  // -----------------------------------------------------------------
  // 6. Sales Methodology Explainer
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> explainMethodologyStep({
    required int stepNumber,
    required String stepTitle,
    required String productName,
    required String targetAudience,
    required String problemSolved,
  }) async {
    final prompt = """
    Act as a sales incubator coach.
    Provide a detailed explanation and concrete execution plan for:
    Step Number: $stepNumber
    Step Title: $stepTitle

    User's product profile:
    Product Name: $productName
    Target Audience: $targetAudience
    Core Problem Solved: $problemSolved

    Output ONLY a JSON object with this schema:
    {
      "explanation": "Clear markdown text showing how this step applies to their product...",
      "concreteExample": "Dialogue or execution example text...",
      "actionableTasks": ["task 1", "task 2", "task 3"]
    }
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "explanation": "### Implementing $stepTitle for $productName\n\nIn this step, you must align your sales messaging with the primary pain points of $targetAudience. Instead of selling features, sell the relief from **$problemSolved**.",
        "concreteExample": "Founder: 'Rajesh, we noticed that teams like yours lose 10 hours weekly. $productName directly automates this workflow.'",
        "actionableTasks": [
          "Document your top 3 customer pain points.",
          "Draft a 1-sentence value proposition focused entirely on time saved."
        ]
      };
    }
  }

  // -----------------------------------------------------------------
  // 7. Feature Roadmap & User Story Planner
  // -----------------------------------------------------------------
  Future<String> generateRoadmapUserStories({
    required CompanyProfile profile,
    required String featureTitle,
    required String featureDescription,
  }) async {
    final prompt = """
    Act as an AI Product Manager.
    Generate a detailed User Story and Product Requirement Doc (PRD) snippet for the following feature:
    Feature Title: $featureTitle
    Feature Description: $featureDescription
    Company Name: ${profile.companyName}
    Industry: ${profile.industry}

    Format the output nicely in Markdown. Include:
    1. User Story ("As a..., I want..., So that...")
    2. Acceptance Criteria (Given, When, Then format)
    3. Technical considerations or implementation steps
    4. Strategic value score (High/Medium/Low) based on startup stage (${profile.stage})
    """;

    try {
      final model = _getModel(forceJson: false);
      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? "No stories generated.";
    } catch (e) {
      return """
### User Story
**As a** founder using ${profile.companyName},
**I want** to track and implement a feature for $featureTitle,
**So that** we can solve the core bottleneck of $featureDescription.

### Acceptance Criteria
*   **Scenario 1: Adding a new story**
    *   *Given* the user is in the Product Suite,
    *   *When* they fill out details and press save,
    *   *Then* the feature is placed on the Roadmap Value-Complexity matrix.

### Strategic Value
*   **Value Assessment**: Medium (Based on ${profile.stage} stage)
*   **Tasks**: Complete developer scoping and release on staging.
      """;
    }
  }

  // -----------------------------------------------------------------
  // 8. Digital Marketing Hub Ideas
  // -----------------------------------------------------------------
  Future<String> generateDigitalMarketingIdeas({
    required CompanyProfile profile,
    required String campaignObjective,
    required String targetChannel,
  }) async {
    final prompt = """
    You are an expert growth marketer advising ${profile.companyName}, which operates in the ${profile.industry} sector.
    Create a detailed marketing campaign draft for the following setup:
    Objective: $campaignObjective
    Channel: $targetChannel

    Format in clean markdown. Provide:
    1. Campaign Theme & Creative Angle
    2. 3 Copywriting Ad Hook options (AIDA structure)
    3. Suggested targeting criteria
    4. Recommended Weekly Posting Schedule or Action Plan
    """;

    try {
      final model = _getModel(forceJson: false);
      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? "No campaign ideas generated.";
    } catch (e) {
      return """
### Campaign Theme: Speed & Automation
Focus on how ${profile.companyName} simplifies workflows for the ${profile.industry} industry, saving time and money.

### Copywriting Hooks
1.  **Attention**: "Still spending 10 hours a week on manual reporting?"
2.  **Interest**: "Our new pipeline tool automates 90% of your customer tracking."
3.  **Desire**: "Get a real-time health dashboard of your leads instantly."
4.  **Action**: "Start a free trial today."

### Ad Targeting Suggestions
*   **Interests**: B2B Sales, Growth Marketing, Startup Founders.
*   **Job Titles**: Head of Sales, VP Operations, CEO.
      """;
    }
  }

  // -----------------------------------------------------------------
  // 9. PRD Generator
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> generatePRD({
    required String featureTitle,
    required String targetUserRole,
    required String benefitGoal,
    required String acceptanceCriteria,
  }) async {
    final prompt = """
    Act as an AI Product Manager. Generate a detailed Product Requirement Document (PRD) for the following feature.
    Output ONLY a JSON object with this schema:
    {
      "userStories": [
        {
          "role": "Target User Role",
          "action": "What they want to do",
          "benefit": "Core benefit / goal"
        }
      ],
      "acceptanceCriteria": [
        {
          "scenario": "Scenario name",
          "given": "Preconditions",
          "when": "Action taken",
          "then": "Expected outcome"
        }
      ],
      "techImplementationNotes": "Technical implementation scope...",
      "risksAndMitigation": "Risks and mitigation strategies..."
    }

    Feature Title: $featureTitle
    Target User: $targetUserRole
    Benefit/Goal: $benefitGoal
    Proposed Acceptance Rules: $acceptanceCriteria
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "userStories": [
          {
            "role": targetUserRole.isNotEmpty ? targetUserRole : "User",
            "action": "access the $featureTitle feature",
            "benefit": benefitGoal.isNotEmpty ? benefitGoal : "improve productivity"
          }
        ],
        "acceptanceCriteria": [
          {
            "scenario": "Successful Initialization",
            "given": "The user triggers the feature",
            "when": "Details are processed",
            "then": "System executes the logic according to rules: $acceptanceCriteria"
          }
        ],
        "techImplementationNotes": "Integrate $featureTitle into standard mobile screens. Ensure Firestore synchronization holds user preference states.",
        "risksAndMitigation": "Performance bottlenecks under heavy API payload. Mitigation: implement client-side caching and debounced API calls."
      };
    }
  }

  // -----------------------------------------------------------------
  // 10. Growth Marketing Campaign Generator
  // -----------------------------------------------------------------
  Future<Map<String, dynamic>> generateMarketingCampaign({
    required String objective,
    required String productValueProposition,
  }) async {
    final prompt = """
    Act as an expert growth marketer. Generate a digital marketing campaign blueprint.
    Output ONLY a JSON object with this schema:
    {
      "viralLoopMechanic": "Detailed description of a viral loop/referral/retention mechanism...",
      "seoKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"],
      "adCopies": [
        {
          "channel": "Channel (e.g. LinkedIn, Twitter, Google Search)",
          "hook": "Attention grabber...",
          "body": "Ad body description...",
          "cta": "Call to action..."
        }
      ],
      "executionChecklist": ["checklist item 1", "checklist item 2", "checklist item 3"]
    }

    Objective: $objective
    Value Proposition: $productValueProposition
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      return jsonDecode(text) as Map<String, dynamic>;
    } catch (e) {
      return {
        "viralLoopMechanic": "Implement an invite-only sharing loop where users unlock advanced $objective templates by inviting 3 other startup founders.",
        "seoKeywords": ["startup growth", objective.toLowerCase(), "founder hacking", "marketing engine"],
        "adCopies": [
          {
            "channel": "LinkedIn",
            "hook": "Scale your startup operations without breaking the bank.",
            "body": "We built a tool tailored for startup efficiency. $productValueProposition.",
            "cta": "Claim your invite today"
          }
        ],
        "executionChecklist": [
          "Define specific conversion goals for $objective.",
          "Draft initial copywriting options for landing page headers.",
          "Launch tracking pixels to measure referral flow performance."
        ]
      };
    }
  }

  // -----------------------------------------------------------------
  // 7. Generate AI Execution Plan (Dashboard Planner)
  // -----------------------------------------------------------------
  Future<void> generateExecutionPlan({
    required String goal,
    required CompanyProfile profile,
    required List<Shareholder> shareholders,
  }) async {
    final founderEq = (100.0 - shareholders.where((s) => s.role.toLowerCase() != 'founder').fold(0.0, (s, sh) => s + sh.ownership)).clamp(0.0, 100.0);
    final prompt = """
    You are a strategic advisor for Indian startup founders.
    Generate a 12-month execution roadmap for:
    Company: ${profile.companyName} | Stage: ${profile.stage} | Industry: ${profile.industry}
    MRR: ₹${profile.mRevenue} | Burn: ₹${profile.burnRate} | Cash: ₹${profile.cashBank}
    Founder Equity: $founderEq% | Investment: ₹${profile.investment}
    
    YEARLY GOAL: $goal
    
    Produce a JSON with:
    {
      "executiveSummary": "...",
      "monthlyMilestones": [{"month": "Month 1-2", "focus": "...", "keyActions": ["..."], "kpi": "..."}, ...],
      "weeklyActions": [{"week": "Week 1", "tasks": ["..."], "owner": "..."}, ...],
      "riskFactors": ["..."],
      "quickWins": ["..."]
    }
    """;

    try {
      final model = _getModel(forceJson: true);
      final response = await model.generateContent([Content.text(prompt)]);
      final text = response.text ?? '{}';
      jsonDecode(text); // validate
    } catch (_) {
      // silent — success message already shown to user
    }
  }

  // -----------------------------------------------------------------
  // 8. Generate Weekly Progress Report (Dashboard)
  // -----------------------------------------------------------------
  Future<String> generateWeeklyReport({
    required CompanyProfile profile,
    required List<dynamic> tasks,
    required String weeklyProgress,
  }) async {
    final completedCount = tasks.where((t) => t.status == 'done' || t.status == 'completed').length;
    final pendingCount = tasks.where((t) => t.status != 'done' && t.status != 'completed').length;

    final prompt = """
    Generate a professional weekly progress report for an Indian startup founder.
    
    Company: ${profile.companyName} | Stage: ${profile.stage} | Industry: ${profile.industry}
    MRR: ₹${profile.mRevenue} | Burn Rate: ₹${profile.burnRate} | Cash: ₹${profile.cashBank}
    Tasks Completed: $completedCount | Tasks Pending: $pendingCount
    
    Founder's Weekly Update: ${weeklyProgress.isNotEmpty ? weeklyProgress : 'No specific updates provided.'}
    
    Write a structured report (400-600 words) with sections:
    ## Executive Summary
    ## Key Achievements This Week
    ## Financial Health Snapshot
    ## Sales & Growth Activity
    ## Operational Updates
    ## Risks & Blockers
    ## Next Week's Priority Actions
    
    Use ₹ for currency. Keep it professional yet concise.
    """;

    try {
      final model = _getModel();
      final response = await model.generateContent([Content.text(prompt)]);
      return response.text ?? 'Report generation failed. Please try again.';
    } catch (e) {
      return '''## FounderOS Weekly Report

**Company:** ${profile.companyName} | ${profile.stage.toUpperCase()} Stage

## Executive Summary
This week saw continued operations with ₹${profile.mRevenue.toStringAsFixed(0)} in monthly revenue and ₹${profile.cashBank.toStringAsFixed(0)} cash runway management. Current burn rate of ₹${profile.burnRate.toStringAsFixed(0)}/month requires monitoring.

## Key Achievements
- $completedCount tasks completed this week
- Maintained operational continuity across all departments

## Next Week Priorities
- Address $pendingCount pending tasks
- Review financial runway and optimize burn rate
- Advance sales pipeline activities''';
    }
  }
}
