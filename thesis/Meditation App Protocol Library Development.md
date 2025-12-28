# **Precision Digital Therapeutics: A Comprehensive Library of Evidence-Based Methodologies for Automated Meditation Generation**

## **Executive Summary: The Shift to Transdiagnostic Precision**

The digital mental health landscape is undergoing a paradigm shift from generalized content delivery to precision behavioral medicine. For decades, the dominant model in meditation applications has been the delivery of generic mindfulness or "hypnotic" tracks regardless of the user's specific psychophysiological state. This "one-size-fits-all" approach, while scalable, fails to address the distinct neurobiological mechanisms underlying different distress states. A user in a state of dorsal vagal shutdown—characterized by immobilization, depression, and numbness—requires a fundamentally different intervention than a user in a sympathetic dominant state of panic, or one experiencing the cognitive rigidity of rumination.

This report serves as the foundational library for a "Therapist Switchboard"—an algorithmic routing system designed to classify user needs and deploy specific, science-based therapeutic protocols. By integrating distinct modalities such as Non-Sleep Deep Rest (NSDR), Somatic Experiencing (SE), Internal Family Systems (IFS), and Acceptance and Commitment Therapy (ACT), an automated system can generate custom meditation scripts that align with the user's immediate nervous system capacity.

This document provides an exhaustive analysis of these frameworks, the specific diagnostic criteria for routing, the neurobiological mechanisms of action, and precise scripting directives for Large Language Models (LLMs) to generate effective, safe, and attuned content. It moves beyond simple instruction to provide a deep architectural blueprint for a transdiagnostic digital therapeutic tool.

## **Part I: The "Therapist Switchboard" – Methodology Routing Logic**

### **1.1 The Transdiagnostic Model and Unified Protocol**

The routing logic proposed here is grounded in a transdiagnostic model of emotional disorders. Traditional psychiatric models rely on categorical diagnoses (e.g., Major Depressive Disorder, Generalized Anxiety Disorder), but modern clinical science increasingly focuses on the underlying mechanisms that cut across these categories. The Unified Protocol (UP) for Transdiagnostic Treatment of Emotional Disorders identifies core dysfunctions such as aversive reactions to emotional experiences, emotional avoidance, and rigid behavioral responses as the true targets of intervention.1

The "Therapist Switchboard" functions as a triage system, assessing the user's *current* state—physiological (body), affective (emotion), and cognitive (thought)—to determine the entry point for intervention. This approach aligns with the Research Domain Criteria (RDoC) framework, which maps psychopathology to functional domains like "Negative Valence Systems" (fear, anxiety) or "Arousal and Regulatory Systems".4

Conventional Cognitive Behavioral Therapy (CBT) operates via a "top-down" mechanism, utilizing the prefrontal cortex to regulate emotions and sensations through logic and reframing. However, in states of high trauma activation, panic, or "bottom-up" hijacking, the prefrontal cortex is often offline or functionally impaired. In such cases, cognitive interventions are not only ineffective but can be counter-productive. "Bottom-up" approaches like Somatic Experiencing or NSDR, which target the brainstem, basal ganglia, and limbic system directly through the body, are clinically indicated.5 The Switchboard’s primary function is to determine whether the user needs top-down regulation (cognitive) or bottom-up regulation (somatic).

### **1.2 Routing Classification Matrix**

To effectively instruct the intermediate LLM, the system must classify the user's input into primary domains of dysregulation. The following matrix outlines the routing logic, mapping user symptoms and linguistic markers to the most efficacious therapeutic framework. This matrix serves as the "decision tree" for the routing algorithm.

| User State / Symptom Presentation | Dominant Nervous System State | Linguistic Markers | Recommended Protocol | Mechanism of Action |
| :---- | :---- | :---- | :---- | :---- |
| **High Anxiety, Panic, Hyperarousal** | Sympathetic Dominance (Fight/Flight) | "Racing heart," "Can't breathe," "Spinning," "Overwhelmed," "Urgent" | **NSDR (Non-Sleep Deep Rest)** | Acetylcholine/Dopamine balance in striatum, visual field expansion, parasympathetic activation.8 |
| **Trauma Triggers, "Freeze," Numbness** | Dorsal Vagal (Shutdown) or High Sympathetic Charge | "Numb," "Stuck," "Frozen," "Checking out," "Floaty," "Blank" | **Somatic Experiencing (SE)** | Interoception, Pendulation, Titration, Orienting Response, restoration of Vagal Tone.5 |
| **Internal Conflict, Shame, Self-Criticism** | Blended State (Cognitive/Emotional Fusion) | "Part of me," "Inner critic," "I hate myself," "I want to but I can't," "Ashamed" | **Internal Family Systems (IFS)** | Externalizing sub-personalities, Unblending, Memory Reconsolidation, reducing amygdala reactivity.11 |
| **Rumination, Obsessive Thoughts, Worry** | Cognitive Rigidity / Fusion | "What if," "Planning," "Analyzing," "Looping thoughts," "Can't stop thinking" | **ACT (Acceptance & Commitment Therapy)** | "Dropping Anchor," Cognitive Defusion, separating "Thinking Self" from "Observing Self".13 |
| **General Stress, Dysregulation** | Mixed / Mild Dysregulation | "Stressed," "Tired," "On edge," "Need a break" | **Polyvagal Exercises** | Physiological sigh, Vagus nerve stimulation, Cold exposure visualization.15 |

### **1.3 Implementation Logic for the Intermediate LLM**

The intermediate LLM functions as the clinical intake coordinator. Its prompt must be structured to analyze the user's *linguistic markers* and *implicit nervous system state* to determine the appropriate routing. It is insufficient to merely look for keywords; the LLM must detect the "energy" of the request.

**Directives for the Classifier:**

1. **Detect Directionality and Origin:** The classifier must determine if the distress is originating from the body (somatic) or the mind (cognitive).  
   * *Somatic Indicators:* References to heart rate, breathing, temperature (hot/cold), muscle tension, pain, or sensory overwhelm.  
   * *Cognitive Indicators:* References to future events, past regrets, self-judgment, planning, or analytical confusion.  
   * *Routing Rule:* If Somatic markers \> Cognitive markers, route to **NSDR** or **Somatic Experiencing**. If Cognitive markers \> Somatic markers, route to **IFS** or **ACT**.  
2. **Assess Intensity and Capacity:** The classifier must estimate the user's "Window of Tolerance".17  
   * *High Intensity (Hyperarousal/Panic):* The user has low capacity for cognitive processing. Complex instructions or "parts work" may be too demanding. Route immediately to **NSDR** (passive) or basic **SE Orienting** (external).  
   * *Low Intensity (Hypoarousal/Numbness):* The user needs gentle activation. Route to **Somatic Experiencing (Titration)** or **Polyvagal Activation**.  
   * *Moderate Intensity:* The user is distressed but functional. Cognitive engagement is possible. Route to **IFS** or **ACT**.  
3. **Identify Conflict and Multiplicity:** Does the user use language indicating duality or internal fragmentation?  
   * *Markers:* "Part of me wants X, but another part wants Y," "I keep sabotaging myself," "I feel like a child."  
   * *Routing Rule:* This is a primary indication for **Internal Family Systems (IFS)**. The "Therapist Switchboard" should prioritize IFS even if anxiety is present, as the anxiety is likely a symptom of the internal conflict.18  
4. **Contraindication Check:**  
   * *Trauma Flag:* If the user mentions "trauma," "flashback," or "abuse," the system must **avoid** deep internal body scans (which can induce panic in trauma survivors) and instead prioritize **External Orienting** (Somatic Experiencing) or **Dropping Anchor** (ACT).19

## **Part II: Protocol A – Non-Sleep Deep Rest (NSDR) & Yoga Nidra**

### **2.1 Theoretical Framework and Clinical Indications**

**Target State:** High Anxiety, Panic, Sleep Deprivation, Cognitive Fatigue, Burnout, Sympathetic Overdrive.

Non-Sleep Deep Rest (NSDR), a term popularized by neurobiologist Dr. Andrew Huberman, encompasses practices like Yoga Nidra and self-hypnosis that induce a state of deep relaxation while maintaining consciousness.21 Unlike traditional meditation, which often requires active focus or "effort" (dharana), NSDR is a process of *de-focusing* and allowing the nervous system to reset. It is a state of "restful alertness."

Differentiation from Yoga Nidra:  
While often used interchangeably, Yoga Nidra ("Yogic Sleep") is an ancient Tantric practice with specific spiritual components, including the setting of a Sankalpa (intention) and the rotation of consciousness through chakras or energy centers.21 NSDR is a secularized, physiological framing of these techniques, stripping away the esoteric language to focus purely on the autonomic nervous system mechanics.24 For a general mental health app, NSDR offers a more accessible, less dogmatic entry point for users who may be skeptical of "spiritual" or "energy" based practices.  
Clinical Utility:  
Research indicates that NSDR protocols are particularly effective for symptom management in cancer treatment, anxiety, pain, and sleep disorders.8 By systematically disengaging the senses (pratyahara), the practice allows the brain to drop into theta and delta wave states typically found in sleep, facilitating neuroplasticity and recovery.24

### **2.2 Neurobiological Mechanism of Action**

The efficacy of NSDR lies in its precise manipulation of neurotransmitters and brain wave states, specifically targeting the striatum and the autonomic nervous system.

1. Dopamine and Acetylcholine Balance in the Striatum:  
   The striatum, a critical component of the basal ganglia, governs motor control, habit formation, and motivation. Recent research suggests that the healthy functioning of the striatum relies on a delicate balance and wave-like interaction between dopamine (motivation/action) and acetylcholine (attention/learning).9 Chronic stress disrupts this balance. NSDR protocols, particularly those involving body scanning (rotation of consciousness), appear to reset this neurochemical environment. The "non-sleep" state allows for the replenishment of dopamine reserves, potentially restoring motivation and motor calm after periods of high stress or agitation.27  
2. Parasympathetic Activation via the Vagus Nerve:  
   NSDR utilizes specific breathing patterns (extended exhalations) and body awareness to engage the parasympathetic nervous system (PNS). This activation stimulates the vagus nerve, which releases acetylcholine onto the heart's pacemaker cells, slowing the heart rate and increasing Heart Rate Variability (HRV)—a key marker of stress resilience.29  
3. Visual Field Expansion and the Brainstem:  
   Anxiety is physiologically linked to "focal vision" (tunnel vision), a sympathetic response mediated by the brainstem to focus on threats. Conversely, "panoramic vision" (soft focus) mechanically triggers a relaxation response. NSDR scripts often instruct users to "soften the eyes" or "expand awareness to the periphery," hijacking this brainstem mechanism to induce calm.8  
4. The Hypnagogic State (Theta Waves):  
   NSDR targets the "liminal state" between wakefulness and sleep. In this state, the brain produces Theta waves (4-8 Hz), which are associated with deep relaxation, creativity, and memory consolidation.26 This state allows for the processing of emotions without the high arousal of the beta-wave "thinking mind."

### **2.3 Detailed Methodology Steps (The Script Architecture)**

To generate an effective NSDR script, the LLM must follow a strict sequence that mimics the physiological progression of falling asleep while keeping the mind awake. The sequence is non-negotiable as it follows the withdrawal of sensory input (Pratyahara).

**Phase 1: Sensory Withdrawal (Pratyahara)**

* **Goal:** Systematically disengage from external stimuli to turn attention inward.  
* **Technique:** Auditory orientation followed by withdrawal.  
* **Scripting Instruction:** The LLM should instruct the user to listen to distant sounds, then sounds within the room, then the sound of their own breath. Crucially, the instruction must be to "hear without analyzing"—simply registering the raw data of sound. This prevents cognitive processing.

**Phase 2: The Physiological Sigh / Respiratory Regulation**

* **Goal:** Immediate CO2 offload to slow the heart and signal safety.  
* **Technique:** The "Physiological Sigh"—a double inhale followed by a long exhale.  
* **Scripting Instruction:** "Instruct the user to inhale deeply through the nose, then take a second, shorter inhale to fully inflate the lungs (popping the collapsed alveoli), followed by a long, extended, audible exhale through the mouth." This specific pattern is the most effective breathing tool for rapid stress reduction.32

**Phase 3: Rotation of Consciousness (Body Scan)**

* **Goal:** Somatosensory saturation to occupy the analytic mind and inhibit the Default Mode Network (DMN).  
* **Technique:** Rapidly moving awareness between specific body points (e.g., right thumb, index finger, wrist, elbow, shoulder).  
* **Scripting Instruction:** The LLM must NOT ask the user to "relax" the body part. It must ask them to "feel" or "sense" the body part. This uses the somatosensory cortex to process input, which inhibits the DMN (rumination). The pacing is critical: it must be rhythmic and slightly fast to keep the mind from wandering, but not so fast as to cause anxiety.34

**Phase 4: Visual Field Expansion / "Space" Awareness**

* **Goal:** Dissolution of bodily boundaries and induction of theta state.  
* **Technique:** Instructing the user to feel the space *inside* the body (microcosm), then the space *around* the body (macrocosm).  
* **Scripting Instruction:** "Imagine the space between your eyes. Now the space inside your ears. Now expand your awareness to the space of the entire room." This abstraction moves the user away from physical sensation into the "void" or deep rest state.34

### **2.4 LLM Generation Directives for NSDR**

System Instruction:  
"You are generating an NSDR script. Your tone must be clinical, flat, and directive but soothing. Do not use emotional language (e.g., 'feel the joy' or 'let go of sadness'). Use purely sensory language (e.g., 'notice the weight,' 'feel the contact,' 'sense the volume')."  
**Pacing Variables:**

* **Intro:** Moderate pace.  
* **Body Scan:** Rhythmic, slightly faster flow to maintain attention.  
* **Deep State:** Slow, with long pauses (5-10 seconds) between instructions.

**Specific Verbiage Constraints:**

* *Do use:* "Bring your attention to..." "Notice the sensation of..." "Shift your awareness to..." "Sensing..."  
* *Do not use:* "Think about..." "Visualize..." (unless specifically visualizing geometry/space). The goal is *sensation*, not *cognition*.  
* *Key Concept:* Emphasize "non-doing." "There is nothing to do, nowhere to go. You are simply a witness."

## **Part III: Protocol B – Somatic Experiencing (SE)**

### **3.1 Theoretical Framework and Clinical Indications**

**Target State:** Trauma Activation, PTSD, Freeze Response, Disassociation, Chronic Pain, Physical "Stuckness," Grief.

Somatic Experiencing (SE), developed by Dr. Peter Levine, is a body-oriented therapeutic model designed to resolve trauma. Unlike talk therapy, which engages the neocortex (logic/language), SE targets the "reptilian brain" (brainstem) where survival instincts (fight/flight/freeze) originate.5

The Core Premise:  
Trauma is not in the event; it is in the nervous system. Animals in the wild discharge survival energy (shaking, trembling, running) after a threat. Humans, governed by the rational neocortex and social conditioning, often suppress this discharge. This leads to "trapped" survival energy, which manifests as anxiety, hypervigilance, or shutdown (freeze).37 SE aims to complete these thwarted survival responses in a slow, controlled manner.

### **3.2 Neurobiological Mechanism: The Orienting Response and Superior Colliculus**

A key mechanism in SE is the **Orienting Response (OR)**. This is the biological reflex of scanning the environment for safety or threat.

* **The Superior Colliculus Connection:** The superior colliculus (SC), a midbrain structure, plays a pivotal role in integrating sensory information (visual, auditory, somatosensory) to initiate head and eye movements toward stimuli.38  
* **Vagus Nerve Integration:** Research shows that the SC projects to the vagus nerve complex (specifically the nucleus ambiguus), linking the act of looking and orienting directly to the regulation of the heart and autonomic state.41  
* **Clinical Implication:** When a user is stuck in a trauma state, their orienting response is often "broken"—they are either hyper-orienting (scanning for danger everywhere) or hypo-orienting (staring blankly). SE exercises that guide the user to slowly move their head and neck to look at their environment ("External Orienting") mechanically re-engage the SC, sending safety signals to the vagus nerve and down-regulating the threat response.19

### **3.3 Key Methodological Concepts: Titration and Pendulation**

The LLM must understand two critical pillars of SE to script it safely. These prevent the user from being flooded by traumatic sensations (retraumatization).

1. Titration:  
   Titration is the process of breaking the difficult experience into the smallest possible pieces—"one drop at a time." It involves "touching the edge" of the discomfort rather than diving into the center of it.44  
   * *Analogy:* Like mixing a volatile chemical, you add one drop of the catalyst at a time to prevent an explosion. In therapy, this means focusing on a *tiny* amount of tension, not the whole story of the trauma.  
2. Pendulation:  
   Pendulation is the rhythmic oscillation between a state of contraction (distress/trauma) and expansion (resource/safety). The nervous system naturally pulses; trauma fixes it in a stuck state. Pendulation retrains the elasticity of the system by moving attention back and forth.37

### **3.4 Detailed Methodology Steps for SE Scripting**

Step 1: Establishing a Resource (The Anchor)  
Before touching any pain, the user must find safety. This is non-negotiable.

* **Scripting Instruction:** "Look around your environment. Let your eyes go where they want to go. Find an object that is pleasing or neutral. Describe its color, texture, and shape." (External Resource).43  
* **Somatic Resource:** "Scan your body for a place that feels neutral or 'okay.' It might be your big toe, your earlobe, or the weight of your bottom on the chair. Rest your attention there.".46

**Step 2: The Felt Sense (Interoception)**

* **Goal:** Move from "story" (I am sad) to "sensation" (My chest feels heavy/grey/tight).  
* **Scripting Instruction:** "When you think of that situation, what happens in your body? Do not think about the event, just notice the body. Is there a tightness? A heat? A numbness? Does it have a shape? A color?".44

**Step 3: Pendulation (The Loop)**

* **Goal:** Touch the distress, then return to safety. This "loops" the nervous system out of the stuck state.  
* **Scripting Instruction:** "Briefly notice that tightness in the chest (contraction). Just for a second. Now, shift your attention back to your hands on your lap (resource). Feel the support there. Take a breath. Now, if it feels safe, just glance at the tightness again. Then back to the hands." This back-and-forth movement is the engine of SE.44

**Step 4: Discharge and Completion**

* **Goal:** Allow the body to release the trapped energy.  
* **Scripting Instruction:** "You might notice a deep breath, a shake, a temperature change, a yawn, or a stomach gurgle. These are signs your nervous system is settling. Allow them to happen. There is no need to stop them.".49

### **3.5 LLM Generation Directives for SE**

System Instruction:  
"You are a Somatic Experiencing guide. Your primary directive is safety and slowness. You must never instruct the user to dive deep into trauma. Use the principle of Titration: small drops of sensation only."  
**Critical Safety Protocols (Contraindications):**

* **Dissociation Check:** If the user reports floating, leaving their body, or feeling "blank," do **NOT** do internal body scanning. This can exacerbate dissociation. Switch immediately to **External Orienting** (naming objects in the room, feeling feet on the floor) to ground them in physical reality.19  
* **Avoid "Why":** The LLM should never ask "Why do you feel this?" It should only ask "What do you feel?" and "Where do you feel it?" "Why" engages the cortex; "What/Where" engages the midbrain.

**Key Scripts for Specific States:**

* *For Freeze/Numbness:* Focus on small movements and proprioception. "Wiggle your toes. Press your feet into the floor. Feel the resistance of the floor meeting your feet. Push against the wall.".50  
* *For Panic/High Charge (The Voo Sound):* "Inhale deeply, and on the exhale, make a low, rumbling 'Voo' sound. Feel the vibration in your belly." This stimulates the vagus nerve and viscera.37

## **Part IV: Protocol C – Internal Family Systems (IFS)**

### **4.1 Theoretical Framework and Clinical Indications**

**Target State:** Procrastination, Inner Conflict ("I want to but I can't"), Shame, Self-Criticism, Indecision, Addictive Impulses.

Internal Family Systems (IFS), developed by Dr. Richard Schwartz, views the mind not as a unitary entity but as a multiplicity of "parts".11 In this model, the user is not "anxious"; rather, a *part* of them is carrying anxiety. This distinction is crucial for unblending.

**Parts Taxonomy:**

1. **Exiles:** Young, vulnerable parts carrying pain, trauma, shame, or fear. They are often locked away ("exiled") by other parts.  
2. **Managers (Protectors):** Proactive parts that control the environment to keep Exiles safe. Examples: The Perfectionist, The Inner Critic, The Worrier, The Planner.  
3. **Firefighters (Protectors):** Reactive parts that act out when Exiles are triggered to douse the emotional flames. Examples: Binge eating, dissociation, rage, substance use.53  
4. **The Self:** The core, undamaged essence of the person, characterized by the "8 Cs": Curiosity, Compassion, Calm, Clarity, Courage, Creativity, Confidence, and Connectedness. The goal of IFS is to be "Self-led".53

### **4.2 Mechanism of Action: Unblending and Memory Reconsolidation**

The primary mechanism of IFS is **Unblending**. When a user says "I am angry," they are *blended* with the angry part. IFS guides them to say "I feel a part of me that is angry." This linguistic and attentional shift creates neurological distance, reducing amygdala reactivity and allowing the prefrontal cortex (Self) to regulate the system.

Furthermore, IFS is believed to facilitate **Memory Reconsolidation**. This is the brain's neuroplastic mechanism for updating long-term memories. By accessing the neural networks associated with traumatic memories (Exiles) while holding a state of safety and compassion (Self energy), the brain can "unlock" the emotional synapse and update the prediction, effectively "healing" the trigger permanently.12

### **4.3 Detailed Methodology Steps (The 6 Fs Protocol)**

The LLM should follow the "6 Fs" framework for exploring a protector part. This is the standard operating procedure for IFS.57

1. **Find:** Locate the part in the body or mind.  
   * *Script:* "Focus on the issue (e.g., the procrastination). Where do you feel it in your body? Is it a voice, an image, or a sensation? Where does it live?"  
2. **Focus:** Turn attention toward it.  
   * *Script:* "Turn your attention gently toward this feeling. Just notice it."  
3. **Flesh it out:** Get more details to make it real.  
   * *Script:* "Does it have a shape? A color? How close is it to you? If it had a voice, what would it sound like?"  
4. **Feel toward:** Assess the relationship between Self and Part. **(Critical Step)**  
   * *Script:* "How do you feel *toward* this part?"  
   * *Logic:* If the user says "I hate it," "I want it gone," or "I'm afraid of it," they are blended with a second part (a concerned protector). The LLM must then ask this second part to step back. The user must feel *Curiosity* or *Compassion* before proceeding.  
5. **Befriend:** Build a relationship.  
   * *Script:* "Ask this part what it is trying to do for you. Ask it what its job is." "Ask what it is afraid would happen if it didn't do this job."  
6. **Fear:** Identify the Exile (without diving in yet).  
   * *Script:* "What is this part protecting you from? What is it afraid you would feel if it stepped aside?"

### **4.4 LLM Generation Directives for IFS**

System Instruction:  
"You are an IFS facilitator. Your role is to help the user access 'Self Energy' (Curiosity/Compassion). You must treat every symptom (even destructive ones like self-harm or addiction) as a 'Part' with a positive intent (protection). You must never judge a part."  
Handling Resistance (The Concerned Part):  
Resistance is not an obstacle; it is another part. If the user cannot access a part or feels blocked:

* *Script:* "That's okay. See if you can find the part that is blocking you. Or the part that is frustrated that it can't find the part. Focus on that one instead.".59

The "Fire Drill" Script (For Active Triggers):  
When a user is actively triggered by a person or event:

* "Imagine the person who triggers you is in a room behind a glass wall."  
* "Notice what happens in your body as you look at them. That reaction is a Protector part."  
* "Turn your focus away from the person in the room and toward the reaction in your body."  
* "Thank this protector for trying to keep you safe. Ask it if it would be willing to separate its energy from you, just a little, so you can get to know it.".60

Clinical Caution:  
For a self-guided app, the LLM should be instructed to work only with Protectors. Accessing Exiles (the traumatized children) can be destabilizing without a human therapist present. If an Exile appears, the script should be: "Let that young part know you see it, you care about it, and you will come back to it, but right now we are just getting to know its protector."

## **Part V: Protocol D – Cognitive & Polyvagal Bridges**

### **5.1 Acceptance & Commitment Therapy (ACT): The "Dropping Anchor" Bridge**

**Target State:** Cognitive Storms, Ruminative Loops, Dissociation, "Spinning."

When a user is lost in a "thought storm," pure somatic work might be too subtle, and pure cognitive work (CBT) might be impossible due to overwhelm. ACT's "Dropping Anchor" protocol is the ideal bridge. It does not try to change the thoughts (CBT); it changes the user's relationship to the thoughts (Defusion).61

The ACE Formula:  
The LLM should use the ACE formula script 14:

1. **A: Acknowledge:** "Silently name what is showing up. 'Here is anxiety.' 'Here is the thought that I am failing.' Do not fight it, just acknowledge its presence."  
2. **C: Come back into the body:** "You are the sky, these thoughts are the weather. Now connect to the earth. Push your feet into the floor. Press your fingertips together. Move your elbows. Feel your physical control." (Active motor engagement).  
3. **E: Engage with the world:** "Look around. Name 5 things you can see. Name 3 things you can hear. Notice the texture of your shirt."

**LLM Directive:** This protocol should be used as an "emergency brake." If the classifier detects "Overwhelm" or "Spinning thoughts" where the user is ungrounded, route to Dropping Anchor immediately.

### **5.2 Polyvagal Regulation: Acute Physiological Resets**

**Target State:** Acute Stress Response, Need for Immediate Calm, "Fight or Flight."

Based on the work of Stephen Porges, these are physiological "hacks" to stimulate the Vagus Nerve and shift the user from Sympathetic (danger) to Ventral Vagal (safety/social engagement).15

**Key Exercises for the Library:**

1. **The Physiological Sigh:**  
   * *Mechanism:* Re-inflates collapsed alveoli and offloads CO2.  
   * *Script:* "Inhale deeply through the nose. Then, take a second, sharp inhale on top to fully fill the lungs. Hold for a micro-second. Now, exhale long and slow through the mouth, like you are fogging a mirror.".32  
2. **Cold Exposure (Visualization/Action):**  
   * *Mechanism:* Triggers the mammalian dive reflex, instantly slowing heart rate.  
   * *Script:* "If you can, splash cold water on your face. Or, imagine a cool breeze hitting your cheeks. Feel the temperature change.".15  
3. **Eye Movements (Oculocardiac Reflex):**  
   * *Script:* "Keeping your head still, look all the way to the right. Hold your eyes there until you feel a need to swallow, sigh, or yawn. Now look all the way to the left." This stretches the eye muscles which connect to the vagal complex.15

## **Part VI: Implementation Guide for the "Therapist Switchboard"**

### **6.1 The Master Routing Algorithm**

To implement this in a meditation app, the backend logic should follow this decision tree. This algorithm integrates the Transdiagnostic and Unified Protocol approaches.1

**Input:** User text query or selection (e.g., "I feel like I'm going to have a heart attack" vs. "I can't stop procrastinating").

**Step 1: Symptom Cluster Identification**

* **Cluster A (Somatic/Panic):** Keywords: Heart, breath, panic, shaking, heat, dizzy.  
  * *Route:* **Polyvagal (Physiological Sigh)** \-\> **NSDR** (to settle).  
* **Cluster B (Somatic/Shutdown):** Keywords: Sadness, heavy, stuck, numbness, fatigue, blank.  
  * *Route:* **Somatic Experiencing** (Titration/Pendulation/Movement).  
* **Cluster C (Cognitive/Conflict):** Keywords: Conflict, "part of me," critic, shame, guilt, self-sabotage.  
  * *Route:* **IFS** (Parts Work).  
* **Cluster D (Cognitive/Rigidity):** Keywords: Thinking, worry, future, past, obsessing.  
  * *Route:* **ACT** (Dropping Anchor).

**Step 2: Contraindication Safety Check**

* *Condition:* **Trauma History** is flagged in user profile OR **High Activation** linguistic markers ("Terror," "Flashback").  
* *Action:* **BLOCK** internal body scans (NSDR) and Unblending (IFS) initially.  
* *Override:* Route to **External Orienting (SE)** or **Dropping Anchor (ACT)**. Internal focus is unsafe for highly traumatized users without stabilization.66

### **6.2 Generative AI Prompting Template**

The following is a meta-prompt structure to ensure the LLM adheres to the clinical frameworks.

Role: Expert Clinical Meditation Guide.  
Context: User is experiencing with \[Intensity\_Level\].  
Selected Framework: \[Protocol\_Name\] (e.g., Internal Family Systems).  
**Constraints & Directives:**

1. **Tone:** (e.g., for IFS: "Curious, compassionate, plural"; for NSDR: "Monotone, directive, slow, clinical").  
2. **Pacing:** \[Protocol\_Pace\] (e.g., for SE: "Extremely slow, leave 10s pauses for interoception. Do not rush the discharge").  
3. **Safety:** If user reports distress increase during session, shift immediately to.  
4. **Mechanism:** Focus on \[Mechanism\] (e.g., "Unblending" or "Vagal Brake").

**Script Structure:**

1. **Validation:** Acknowledge the state without judgment (Transdiagnostic acceptance).  
2. **Entry:** Begin the specific protocol entry (e.g., "Find the part" or "Double inhale").  
3. **Deepening:** Loop the protocol (e.g., "Pendulate between resource and tension").  
4. **Integration:** End with a moment of gratitude to the body/parts.

**Prohibited Terms:** Do not use "relax" if the user is anxious (use "settle" or "ground"). Do not use "let go" if the user is holding on (use "acknowledge"). Do not offer medical advice.

### **6.3 Future Directions and "Living" Library**

As the library expands, it should incorporate feedback loops. If a user rates an IFS session poorly, the system should ask "Was it too overwhelming?" or "Did you feel nothing?"

* *Too overwhelming:* Next time, route to **SE Titration** (smaller pieces).  
* *Felt nothing:* Next time, route to **NSDR** (passive engagement) or **Polyvagal Activation** (cold water/movement).

This dynamic adjustment turns the static library into an adaptive therapeutic agent, mirroring the attunement of a skilled clinician. By systematically applying these protocols, the application moves beyond "wellness" and into the realm of digital therapeutics.

---

**Key Research Sources:**

* **NSDR/Yoga Nidra:** 8  
* **Somatic Experiencing:** 5  
* **Internal Family Systems:** 11  
* **Polyvagal Theory:** 15  
* **ACT/CBT:** 13  
* **Transdiagnostic/Unified Protocol:** 1

#### **Works cited**

1. Cognitive-Behavioral Treatments for Anxiety and Stress-Related Disorders \- PMC, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC8475916/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8475916/)  
2. The Unified Protocol for Transdiagnostic Treatment of Emotional Disorders Compared With Diagnosis-Specific Protocols for Anxiety Disorders: A Randomized Clinical Trial \- PMC \- NIH, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC5710228/](https://pmc.ncbi.nlm.nih.gov/articles/PMC5710228/)  
3. Unified Protocol Institute – Transdiagnostic cognitive behavioral therapy, accessed December 26, 2025, [https://unifiedprotocol.com/](https://unifiedprotocol.com/)  
4. Mindfulness Meditation and Psychopathology \- PMC \- PubMed Central, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC6597263/](https://pmc.ncbi.nlm.nih.gov/articles/PMC6597263/)  
5. What is CBT vs. Somatic Therapy? \- North Carolina Center for Resiliency, accessed December 26, 2025, [https://www.nccenterforresiliency.com/somatic-articles/what-is-cbt-vs-somatic-therapy/](https://www.nccenterforresiliency.com/somatic-articles/what-is-cbt-vs-somatic-therapy/)  
6. Somatic Therapy vs. CBT: 6 Key Differences | Expert Analysis, accessed December 26, 2025, [https://somatictherapypartners.com/somatic-therapy-vs-cbt/](https://somatictherapypartners.com/somatic-therapy-vs-cbt/)  
7. Somatic Experiencing vs CBT: Key Insights for Therapists \- Clinical Events, accessed December 26, 2025, [https://clinicalevents.org/somatic-experiencing-vs-cognitive-behavioral-therapy-what-therapists-should-know/](https://clinicalevents.org/somatic-experiencing-vs-cognitive-behavioral-therapy-what-therapists-should-know/)  
8. Guided Imagery and Meditation Resources | UCSF Osher Center for Integrative Health, accessed December 26, 2025, [https://osher.ucsf.edu/guided-imagery-meditation-resources](https://osher.ucsf.edu/guided-imagery-meditation-resources)  
9. A new wave theory for the dopamine-acetylcholine balance | Human Frontier Science Program, accessed December 26, 2025, [https://www.hfsp.org/hfsp-news/new-wave-theory-dopamine-acetylcholine-balance](https://www.hfsp.org/hfsp-news/new-wave-theory-dopamine-acetylcholine-balance)  
10. SOMATIC AND BODY- BASED SELF-REGULATION \- Arizona Trauma Institute, accessed December 26, 2025, [https://aztrauma.org/wp-content/uploads/2020/05/Body-Based-Self-Regulation-PPT.pdf](https://aztrauma.org/wp-content/uploads/2020/05/Body-Based-Self-Regulation-PPT.pdf)  
11. IFS Meditation for Unburdening Parts \- Internal Family Systems Guided Meditation (Beginner Level) | Mentally Fit Pro, accessed December 26, 2025, [https://www.mentallyfitpro.com/c/share-a-resource/ifs-meditation-for-unburdening-parts-internal-family-systems-guided-meditation-beginner-level](https://www.mentallyfitpro.com/c/share-a-resource/ifs-meditation-for-unburdening-parts-internal-family-systems-guided-meditation-beginner-level)  
12. Memory reconsolidation is how Internal Family Systems leads to transformation, accessed December 26, 2025, [https://www.vanessakredler.com/blog/memory-reconsolidation-is-how-internal-family-systems-leads-to-transformation](https://www.vanessakredler.com/blog/memory-reconsolidation-is-how-internal-family-systems-leads-to-transformation)  
13. Free Audio | ACT Mindfully, accessed December 26, 2025, [https://www.actmindfully.com.au/free-stuff/free-audio/](https://www.actmindfully.com.au/free-stuff/free-audio/)  
14. Dropping the Anchor to Help You Reconnect | Concentric Counseling, accessed December 26, 2025, [https://www.concentricchicago.com/blog/2025/9/17/how-dropping-the-anchor-can-help-you-reconnect-with-yourself](https://www.concentricchicago.com/blog/2025/9/17/how-dropping-the-anchor-can-help-you-reconnect-with-yourself)  
15. Polyvagal Theory Explained: Practical Ways to Get Out of “Fight or Flight”, accessed December 26, 2025, [https://startmywellness.com/2025/10/polyvagal-theory-explained-practical-ways-to-get-out-of-fight-or-flight/](https://startmywellness.com/2025/10/polyvagal-theory-explained-practical-ways-to-get-out-of-fight-or-flight/)  
16. The Science of Sighing \- Natural Route Health, accessed December 26, 2025, [https://www.natural-route.com/blog/science-of-sighing](https://www.natural-route.com/blog/science-of-sighing)  
17. Pendulation and Titration: Core Trauma Tools for Gentle Healing, accessed December 26, 2025, [https://www.redbeardsomatictherapy.com/post/window-of-tolerance-understanding-your-nervous-systems-comfort-zone-copy-2](https://www.redbeardsomatictherapy.com/post/window-of-tolerance-understanding-your-nervous-systems-comfort-zone-copy-2)  
18. Comparing Internal Family Systems and Cognitive Behavioral Therapy | Psychology Today, accessed December 26, 2025, [https://www.psychologytoday.com/us/blog/internal-family-systems-therapy-for-shame-and-guilt/202412/comparing-internal-family-systems](https://www.psychologytoday.com/us/blog/internal-family-systems-therapy-for-shame-and-guilt/202412/comparing-internal-family-systems)  
19. Instructional Guide to Somatic Resourcing Strategies for Containment and Orienting, accessed December 26, 2025, [https://usabp.org/Viewpoint-Articles/8902398](https://usabp.org/Viewpoint-Articles/8902398)  
20. Why Relaxation Techniques Don't Work for Trauma & What to Do Instead, accessed December 26, 2025, [https://healingwellcounseling.com/blog/trauma-survivors-why-relaxation-techniques-dont-work-and-what-to-do-instead/](https://healingwellcounseling.com/blog/trauma-survivors-why-relaxation-techniques-dont-work-and-what-to-do-instead/)  
21. NSDR Is the Trendy Practice Right Now. But Is It Better Than Yoga Nidra?, accessed December 26, 2025, [https://www.yogajournal.com/yoga-101/types-of-yoga/yoga-nidra/nsdr-or-yoga-nidra/](https://www.yogajournal.com/yoga-101/types-of-yoga/yoga-nidra/nsdr-or-yoga-nidra/)  
22. Non-Sleep Deep Rest (NSDR) \- Huberman Lab, accessed December 26, 2025, [https://www.hubermanlab.com/nsdr](https://www.hubermanlab.com/nsdr)  
23. Non-Sleep Deep Rest (NSDR): Exploring a World Beyond Sleep \- Positive Psychology, accessed December 26, 2025, [https://positivepsychology.com/non-sleep-deep-rest-nsdr/](https://positivepsychology.com/non-sleep-deep-rest-nsdr/)  
24. NSDR vs Yoga Nidra: What Is Yoga Nidra and Is It Deep Rest? \- re-origin, accessed December 26, 2025, [https://www.re-origin.com/articles/yoga-nidra-vs-nsdr](https://www.re-origin.com/articles/yoga-nidra-vs-nsdr)  
25. NSDR Is the Trendy Practice Right Now. But Is It Better Than Yoga Nidra?, accessed December 26, 2025, [https://jenniferreisyoga.com/blog/nsdr-is-the-trendy-practice-right-now-but-is-it-better-than-yoga-nidra/](https://jenniferreisyoga.com/blog/nsdr-is-the-trendy-practice-right-now-but-is-it-better-than-yoga-nidra/)  
26. Neuroscience research shows how mindfulness meditation fosters a unique state of relaxed alertness \- PsyPost, accessed December 26, 2025, [https://www.psypost.org/neuroscience-research-shows-how-mindfulness-meditation-fosters-a-unique-state-of-relaxed-alertness/](https://www.psypost.org/neuroscience-research-shows-how-mindfulness-meditation-fosters-a-unique-state-of-relaxed-alertness/)  
27. Firing It Up | Harvard Medical School, accessed December 26, 2025, [https://hms.harvard.edu/news/firing](https://hms.harvard.edu/news/firing)  
28. Enhancing striatal acetylcholine facilitates dopamine release and striatal output in parkinsonian mice \- PMC \- PubMed Central, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC11616140/](https://pmc.ncbi.nlm.nih.gov/articles/PMC11616140/)  
29. Polyvagal theory: a journey from physiological observation to neural innervation and clinical insight \- Frontiers, accessed December 26, 2025, [https://www.frontiersin.org/journals/behavioral-neuroscience/articles/10.3389/fnbeh.2025.1659083/full](https://www.frontiersin.org/journals/behavioral-neuroscience/articles/10.3389/fnbeh.2025.1659083/full)  
30. Polyvagal Theory: A Science of Safety \- PMC \- PubMed Central, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC9131189/](https://pmc.ncbi.nlm.nih.gov/articles/PMC9131189/)  
31. \#NSDR (Non-Sleep Deep Rest) with Dr. Andrew Huberman \- YouTube, accessed December 26, 2025, [https://www.youtube.com/watch?v=AKGrmY8OSHM](https://www.youtube.com/watch?v=AKGrmY8OSHM)  
32. Physiological Sigh: A 30-Second Breathing Exercise to Lower Stress \- Oura Ring, accessed December 26, 2025, [https://ouraring.com/blog/what-is-the-physiological-sigh-how-to-do-it/](https://ouraring.com/blog/what-is-the-physiological-sigh-how-to-do-it/)  
33. 'Cyclic sighing' can help breathe away anxiety \- Stanford Medicine, accessed December 26, 2025, [https://med.stanford.edu/news/insights/2023/02/cyclic-sighing-can-help-breathe-away-anxiety.html](https://med.stanford.edu/news/insights/2023/02/cyclic-sighing-can-help-breathe-away-anxiety.html)  
34. NSDR Protocols: Ultimate Guide with 5 Complete Scripts | ILLUMINATION \- Medium, accessed December 26, 2025, [https://medium.com/illumination/nsdr-protocols-ultimate-guide-with-5-complete-scripts-c451f8fdedb3](https://medium.com/illumination/nsdr-protocols-ultimate-guide-with-5-complete-scripts-c451f8fdedb3)  
35. Use of Mobile Apps and Online Programs of Mindfulness and Self-Compassion Training in Workers: A Scoping Review \- PMC, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC9444703/](https://pmc.ncbi.nlm.nih.gov/articles/PMC9444703/)  
36. What is Somatic Experiencing: A Body-Based Approach to Healing Trauma, accessed December 26, 2025, [https://mulberrybush.org.uk/what-is-somatic-experiencing/](https://mulberrybush.org.uk/what-is-somatic-experiencing/)  
37. Somatic Experiencing Therapy: 10 Best Exercises & Examples \- Positive Psychology, accessed December 26, 2025, [https://positivepsychology.com/somatic-experiencing/](https://positivepsychology.com/somatic-experiencing/)  
38. Superior Colliculus to VTA pathway controls orienting response and influences social interaction in mice \- PMC \- PubMed Central, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC8831635/](https://pmc.ncbi.nlm.nih.gov/articles/PMC8831635/)  
39. Superior Colliculus to VTA pathway controls orienting response to conspecific stimuli, accessed December 26, 2025, [https://www.biorxiv.org/content/10.1101/735340v2.full-text](https://www.biorxiv.org/content/10.1101/735340v2.full-text)  
40. Neuroanatomy, Superior Colliculus \- StatPearls \- NCBI Bookshelf, accessed December 26, 2025, [https://www.ncbi.nlm.nih.gov/books/NBK544224/](https://www.ncbi.nlm.nih.gov/books/NBK544224/)  
41. Wired to Connect: The Autonomic Socioemotional Reflex Arc \- Frontiers, accessed December 26, 2025, [https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.841207/full](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2022.841207/full)  
42. Neuroanatomy, Nucleus Ambiguus \- StatPearls \- NCBI Bookshelf, accessed December 26, 2025, [https://www.ncbi.nlm.nih.gov/books/NBK547744/](https://www.ncbi.nlm.nih.gov/books/NBK547744/)  
43. Alive in the Body: Healing Trauma and Overwhelm with Somatic Experiencing by Sergio Ocampo, SEP, accessed December 26, 2025, [https://traumahealing.org/alive-in-the-body-healing-trauma-and-overwhelm-with-somatic-experiencing/](https://traumahealing.org/alive-in-the-body-healing-trauma-and-overwhelm-with-somatic-experiencing/)  
44. Somatic Experiencing: 7 Exercises to Release Stress \- Balanced Awakening, accessed December 26, 2025, [https://balancedawakening.com/blog/exercises-and-examples-of-somatic-experiencing-therapy](https://balancedawakening.com/blog/exercises-and-examples-of-somatic-experiencing-therapy)  
45. Uncovering the Role of Pendulation in Trauma Therapy, accessed December 26, 2025, [https://www.thirdnaturetherapy.com/blog/what-is-pendulation](https://www.thirdnaturetherapy.com/blog/what-is-pendulation)  
46. Pendulation Exercise \- Connecting to Resources (Pendulation ..., accessed December 26, 2025, [https://www.new-synapse.com/aps/wordpress/?p=454](https://www.new-synapse.com/aps/wordpress/?p=454)  
47. Resourcing, Pendulation and Titration: Practices from Somatic Experiencing® | Psychotherapy for Women, Families, and Children in Berkeley, CA \- Sarah Ross, PhD, accessed December 26, 2025, [https://sarahrossphd.com/resourcing-pendulation-titration-practices-somatic-experiencing/](https://sarahrossphd.com/resourcing-pendulation-titration-practices-somatic-experiencing/)  
48. 1 Peter Levine's 2 Step Self-Holding Exercise \- New Synapse, accessed December 26, 2025, [https://www.new-synapse.com/aps/wordpress/wp-content/uploads/2016/04/printable-2-step-self-holding.pdf](https://www.new-synapse.com/aps/wordpress/wp-content/uploads/2016/04/printable-2-step-self-holding.pdf)  
49. SOMATIC EXPERIENCING HANDOUT \- Healthy Futures, accessed December 26, 2025, [https://healthyfuturesaz.com/images/SEHandout.pdf](https://healthyfuturesaz.com/images/SEHandout.pdf)  
50. Somatic Self Care | Office of Well-Being \- Johns Hopkins Medicine, accessed December 26, 2025, [https://www.hopkinsmedicine.org/office-of-well-being/connection-support/somatic-self-care](https://www.hopkinsmedicine.org/office-of-well-being/connection-support/somatic-self-care)  
51. Somatic experiencing: using interoception and proprioception as core elements of trauma therapy \- PMC \- PubMed Central, accessed December 26, 2025, [https://pmc.ncbi.nlm.nih.gov/articles/PMC4316402/](https://pmc.ncbi.nlm.nih.gov/articles/PMC4316402/)  
52. The Internal Family Systems Model Outline | IFS Institute, accessed December 26, 2025, [https://ifs-institute.com/resources/articles/internal-family-systems-model-outline](https://ifs-institute.com/resources/articles/internal-family-systems-model-outline)  
53. Internal Family Systems Therapy: Exploring the IFS Approach to Healing \- Layla Care, accessed December 26, 2025, [https://www.layla.care/resources/internal-family-systems](https://www.layla.care/resources/internal-family-systems)  
54. How Does Internal Family Systems Therapy Work: Top 6 Benefits, accessed December 26, 2025, [https://www.intensivetherapyretreat.com/how-does-internal-family-systems-therapy-work/](https://www.intensivetherapyretreat.com/how-does-internal-family-systems-therapy-work/)  
55. Internal Family Systems (IFS) Therapy \- Psychotraumatology, accessed December 26, 2025, [https://iptrauma.org/docs/evidence-based-trauma-therapies-and-models/internal-family-systems-ifs-therapy/](https://iptrauma.org/docs/evidence-based-trauma-therapies-and-models/internal-family-systems-ifs-therapy/)  
56. How Internal Family Systems Therapy Works | Neuroscience of Healing | Integrative Psychotherapy Toronto, accessed December 26, 2025, [https://www.integrativepsychotherapytoronto.com/blogs/how-internal-family-systems-ifs-works](https://www.integrativepsychotherapytoronto.com/blogs/how-internal-family-systems-ifs-works)  
57. Unburdening Parts in IFS Exercise with Script | Mentally Fit Pro, accessed December 26, 2025, [https://www.mentallyfitpro.com/c/therapy-activities-exercises/ifs-therapy-script-for-unburdening-parts](https://www.mentallyfitpro.com/c/therapy-activities-exercises/ifs-therapy-script-for-unburdening-parts)  
58. The 6 F's in IFS \- The 6 Steps to get to know our protectors \- Therapy with Alessio, accessed December 26, 2025, [https://www.therapywithalessio.com/articles/the-6-fs-in-ifs-the-6-steps-to-get-to-know-our-protectors](https://www.therapywithalessio.com/articles/the-6-fs-in-ifs-the-6-steps-to-get-to-know-our-protectors)  
59. My IFS Cheat Sheet. This is the list of steps, and sample… | by braintots | Medium, accessed December 26, 2025, [https://medium.com/@braintots/my-ifs-cheat-sheet-7dada3fb0e18](https://medium.com/@braintots/my-ifs-cheat-sheet-7dada3fb0e18)  
60. Internal Family Systems Therapy: 8 Worksheets and Exercises \- Positive Psychology, accessed December 26, 2025, [https://positivepsychology.com/internal-family-systems-therapy/](https://positivepsychology.com/internal-family-systems-therapy/)  
61. CBT vs Somatic Therapy: What's the Real Difference? \- Embodywise, accessed December 26, 2025, [https://embodywise.com/the-key-differences-between-cbt-and-somatic-therapy/](https://embodywise.com/the-key-differences-between-cbt-and-somatic-therapy/)  
62. Dropping Anchor: Simple Grounding for Life's Storms \- Dr Charlie Tyack, accessed December 26, 2025, [https://charlietyack.com/dropping-anchor-simple-grounding-for-lifes-storms/](https://charlietyack.com/dropping-anchor-simple-grounding-for-lifes-storms/)  
63. How To 'Drop Anchor' \- Survivors of Abuse Recovering, accessed December 26, 2025, [https://survivorsofabuserecovering.ca/wp-content/uploads/2019/10/Dropping-anchor-handout-ACE-formula-Russ-Harris-2019.pdf](https://survivorsofabuserecovering.ca/wp-content/uploads/2019/10/Dropping-anchor-handout-ACE-formula-Russ-Harris-2019.pdf)  
64. Engaging Polyvagal Theory Exercises (PDF Available) \- Trauma Therapist Institute, accessed December 26, 2025, [https://www.traumatherapistinstitute.com/blog/Engaging-Polyvagal-Theory-Exercises-PDF-Available](https://www.traumatherapistinstitute.com/blog/Engaging-Polyvagal-Theory-Exercises-PDF-Available)  
65. 10 Polyvagal Therapy Exercises to Try Alone or With a Group \- Maximé Clarity, accessed December 26, 2025, [https://maximeclarity.com/blog-2-1/polyvagal-therapy-exercises](https://maximeclarity.com/blog-2-1/polyvagal-therapy-exercises)  
66. 'These parts will fight to the end to protect you' | BPS \- British Psychological Society, accessed December 26, 2025, [https://www.bps.org.uk/psychologist/these-parts-will-fight-end-protect-you](https://www.bps.org.uk/psychologist/these-parts-will-fight-end-protect-you)  
67. Is IFS Dangerous to Do on Your Own? A Thoughtful Approach to Self-Led Healing, accessed December 26, 2025, [https://www.internalfamilysystems.org/blog/Is%20IFS%20Dangerous%20to%20Do%20on%20Your%20Own](https://www.internalfamilysystems.org/blog/Is%20IFS%20Dangerous%20to%20Do%20on%20Your%20Own)  
68. Somatic experiencing: using interoception and proprioception as core elements of trauma therapy \- Frontiers, accessed December 26, 2025, [https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00093/full](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2015.00093/full)  
69. Trauma stabilization through polyvagal theory and DBT \- American Counseling Association, accessed December 26, 2025, [https://www.counseling.org/publications/counseling-today-magazine/article-archive/article/legacy/trauma-stabilization-through-polyvagal-theory-and-dbt](https://www.counseling.org/publications/counseling-today-magazine/article-archive/article/legacy/trauma-stabilization-through-polyvagal-theory-and-dbt)