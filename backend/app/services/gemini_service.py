import google.generativeai as genai
import os
import random
import traceback


class GeminiService:
    """Service for Gemini AI integration for emotional support ONLY"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def is_emotional_support_topic(self, message):
        """Determines if the message is seeking emotional support, including general guidance/overwhelm."""
        lower_message = message.lower().strip()
        
        # --- Core Emotional Distress & Guidance Seeking ---
        emotional_distress_signals = [
            # Core emotional states
            'broken', 'shattered', 'lost', 'empty', 'numb',
            'drowning', 'drowning in', 'can\'t breathe', "can't breathe",
            'falling apart', 'falling to pieces', 'coming apart',
            
            # Pain expressions
            'hurting', 'in pain', 'my heart hurts', 'heart is broken',
            'emotional pain', 'mental pain', 'suffering',
            
            # Overwhelm/Guidance seeking 
            'overwhelmed', 'can\'t cope', "can't cope", 'can\'t handle', "can't handle",
            'too much', 'too hard', 'can\'t take it', "can't take it",
            'what to do', 'what should i do', 'how should i', 'how to face',
            'how to start', 'how to get through', 'i need direction', 'i need motivation',
            
            # Loneliness/isolation
            'alone', 'lonely', 'no one understands', 'no one gets it',
            'isolated', 'disconnected',
            
            # Existential
            'lost hope', 'no hope', 'hopeless', 'nothing matters',
            'what\'s the point', "what's the point", 'why bother',
            
            # Crisis indicators (handled separately but good for detection)
            'want to die', 'end it all', 'give up'
        ]
        
        if any(signal in lower_message for signal in emotional_distress_signals):
            return True
        
        # --- Emotional Words with Personal Context (omitted for brevity) ---
        emotional_words = [
            'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
            'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful',
            'hate', 'scared', 'fear', 'exhausted', 'hopeless',
            'useless', 'worthless', 'cry', 'crying', 'tears', 'miserable',
            'heartbroken', 'grieving', 'devastated', 'tragic', 'upset',
            'happy', 'excited', 'joyful', 'grateful', 'proud', 'relieved',
            'nervous', 'tense', 'on edge', 'panic', 'panicking'
        ]
        
        emotional_expressions = [
            'i feel', 'im feeling', "i'm feeling", 'i am feeling',
            'feeling like', 'feeling so', 'feeling really', 'feeling very',
            'i am', 'im so', "i'm so", 'so i', 'really i',
            'my heart', 'my mind', 'my soul', 'my spirit',
            'cant stop', "can't stop", 'always feeling', 'keep feeling'
        ]
        
        has_emotional_words = any(word in lower_message for word in emotional_words)
        has_emotional_expressions = any(expr in lower_message for expr in emotional_expressions)
        
        has_personal_reference = any(pronoun in lower_message for pronoun in [
            'i ', 'im ', "i'm ", 'my ', 'me ', 'myself',
            'i am ', 'i feel', 'i need', 'i want', 'i cant', "i can't"
        ])
        
        if (has_emotional_words or has_emotional_expressions) and has_personal_reference:
            return True
        
        # --- Reject Non-Emotional Content (Triggers redirection/cheerleading in fallback) ---
        # Note: Added more general task/work terms
        clear_non_emotional = [
            # Technical/Programming/Academic
            'code', 'python', 'javascript', 'programming', 'function',
            'algorithm', 'debug', 'error', 'bug', 'api', 'database',
            'html', 'css', 'server', 'website', 'app', 'software', 
            'assignment', 'homework', 'project', 'solve for', 'formula', 'calculate', 
            'math', 'physics', 'chemistry', 'explain the concept of',
            
            # Work/Finance/Legal
            'business plan', 'marketing strategy', 'resume advice', 'stock market', 
            'legal advice', 'medical diagnosis', 'sue someone', 
            
            # General Knowledge/How-to
            'what is', 'who is', 'when was', 'where is', 'define', 'history of', 
            'how to make', 'how to build', 'how to cook', 'how to fix',
            'write a story', 'write a poem', 'movie review', 'tv show',
            
            # Testing
            'hello world', 'test test', 'ignore previous', 'what can you do', 'your purpose' 
        ]
        
        if any(non_emo in lower_message for non_emo in clear_non_emotional):
            return False
        
        if len(lower_message.split()) <= 5 and has_personal_reference:
            return True
        
        return has_personal_reference

    def analyze_sentiment(self, message):
        """Analyze sentiment, now including 'struggling' for guidance-seeking."""
        lower_message = message.lower()
        
        # --- Crisis detection (omitted for brevity) ---
        crisis_keywords = [
            'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
            'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
            'better off dead', 'no reason to live', 'can\'t go on', 'end it all',
            'overdose', 'jump off', 'hurt someone', 'kill someone', 'attack someone',
            'ending things', 'ending it all'
        ]
        if any(phrase in lower_message for phrase in crisis_keywords):
            return 'crisis'
        
        # --- Negative emotions (omitted for brevity) ---
        negative_keywords = [
            'broken', 'shattered', 'drowning', 'falling apart', 'hurting', 'pain', 
            'suffering', 'overwhelmed', 'cant cope', "can't cope", 'cant handle', 
            'lonely', 'isolated', 'hopeless', 'sad', 'depressed', 'anxious', 
            'stressed', 'worried', 'angry', 'frustrated', 'hurt', 'bad', 
            'terrible', 'awful', 'hate', 'scared', 'fear', 'exhausted',
            'useless', 'worthless', 'cry', 'crying', 'miserable', 'heartbroken',
            'grieving', 'devastated', 'upset', 'nervous', 'tense', 'panic'
        ]
        
        # --- Struggling/Guidance-Seeking (Detects 'how should i face my day') ---
        struggle_keywords = [
            'what to do', 'what should i do', 'how to face', 'how to start',
            'how to get through', 'i need direction', 'i need motivation',
            'i dont know', "i don't know", 'lost', 'confused', 'stuck',
            'what now', 'what next', 'how can i', 'why do i feel'
        ]
        
        if any(phrase in lower_message for phrase in struggle_keywords) and not any(word in lower_message for word in negative_keywords):
            return 'struggling'

        if any(word in lower_message for word in negative_keywords):
            return 'negative'
            
        # --- Positive emotions (omitted for brevity) ---
        positive_keywords = [
            'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
            'grateful', 'awesome', 'fantastic', 'brilliant', 'excellent',
            'proud', 'joyful', 'energetic', 'confident', 'relieved',
            'content', 'peaceful', 'calm', 'serene', 'glad', 'pleased',
            'hopeful', 'optimistic', 'inspired', 'motivated'
        ]
        
        if any(word in lower_message for word in positive_keywords):
            return 'positive'
        else:
            return 'neutral'
    
    def generate_response(self, user_message, sentiment, conversation_context=None):
        """Generate natural emotional support responses"""
        try:
            if sentiment == 'crisis':
                return self._get_crisis_response()
            
            if self.api_key and self.is_emotional_support_topic(user_message):
                return self._generate_gemini_response(user_message, sentiment)
            else:
                if not self.is_emotional_support_topic(user_message):
                    return self._get_gentle_guidance(user_message)
                return self._get_fallback_response(sentiment)
        
        except Exception as e:
            print(f"Error: {e}")
            return self._get_fallback_response(sentiment)
    
    def _generate_gemini_response(self, user_message, sentiment):
        """Generate response using Gemini with natural flowing style, tone adjusted by sentiment."""
        try:
            # --- System Prompt Revision (Focusing on Nuance) ---
            system_prompt = """You are Calmi, a warm, supportive, and **grounded** emotional companion. You only provide emotional support.

Respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

Focus on:
1. **Validating their feelings** (using appropriate intensity based on sentiment).
2. **Showing genuine empathy** and presence.
3. **Offering gentle, actionable next steps** or self-compassion.

Tailor the tone based on the user's sentiment:
* **'negative'**: Use **deep empathy**, validation of pain, and gentle acceptance.
* **'struggling'**: Use a **motivational, directional, and high-agency tone**. Acknowledge they are seeking a **starting point or positive perspective**. Focus on small, manageable actions, building positive habits, or choosing a focus for the hour/day. **Do not use overly dramatic language, apologize, or assume the user is sad/overwhelmed if they ask for direction.** Keep the tone light, encouraging, and respectful of their ability to cope.
* **'positive'**: Acknowledge and encourage savoring the good mood.

No advice about non-emotional topics. Always be a friend, never a therapist."""

            prompt = f"""{system_prompt}

The user is reaching out for emotional support. Their detected sentiment is **'{sentiment}'**.
They say: "{user_message}"

Respond with natural, flowing sentences that show appropriate empathy and offer real, grounded emotional support. No colons, no lists, just warm, compassionate conversation."""
            # ----------------------------------------------------

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=150,
                    temperature=0.75,
                ),
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]
            )
            
            if response.text:
                text = response.text.strip()
                text = text.replace(':', '.').replace('•', '').replace('-', '')
                if not text.endswith(('.', '!', '?')):
                    text = text + '.'
                return text
            
            return self._get_fallback_response(sentiment)
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._get_fallback_response(sentiment)
    
    def _get_gentle_guidance(self, user_message):
        """For non-emotional messages, gently guide to emotional sharing OR provide warm redirection/cheering."""
        lower_msg = user_message.lower()
        
        # --- 1. Check for Task/Work looking for Encouragement (CHEERLEADING) ---
        task_keywords = ['assignment', 'homework', 'project', 'studying', 'work on', 'gonna do', 'starting my', 'need to finish']
        
        if any(keyword in lower_msg for keyword in task_keywords):
            # Cheerleading Response
            cheer_responses = [
                "That sounds like a big task! While I can't help you with the assignment itself, I can absolutely cheer you on. Remember to take breaks and be kind to yourself as you work. You've got this!",
                "I hear you're diving into some unrelated work. That takes focus! I'm here for emotional support, but I'm sending you all the motivation and good energy for your task. What's the first small step you're going to tackle?",
                "That's outside my mental wellness focus, but I admire your dedication to getting it done! Take a deep breath, break it down, and know that I'm rooting for you to succeed in your project!",
                "Great work starting that project! I can't write code or solve equations, but I can remind you to stay hydrated and step away every 45 minutes. Go get those tasks done!"
            ]
            return random.choice(cheer_responses)

        # --- 2. Check for purely factual/technical requests (WARM REDIRECTION) ---
        technical_factual_keywords = ['code', 'python', 'javascript', 'math', 'algorithm', 'function', 'formula', 'api', 'explain the concept of', 'solve for', 'define', 'history of', 'science', 'physics', 'chemistry', 'business plan', 'legal advice', 'medical diagnosis', 'how to cook', 'how to make']
        
        if any(keyword in lower_msg for keyword in technical_factual_keywords):
            # Warm Redirection Response
            redirection_responses = [
                "I am here to support you emotionally and guide you through your feelings. For help with technical or factual questions, I recommend trying **Google Search** or specific expert platforms like **Stack Overflow** or **Khan Academy**.",
                "My purpose is to be a supportive companion for your mental wellness. If you need assistance with technical or complex subjects, the web has excellent resources! I'm here if you want to talk about how you're *feeling* about that complicated topic.",
                "That's a complex question! It's outside my area of expertise, which is emotional support and self-care. I encourage you to use professional platforms for answers to non-emotional queries."
            ]
            return random.choice(redirection_responses)

        # --- 3. Check for emotional phrases that might have been missed (Guidance) ---
        emotional_phrases = [
            'what to do', 'help me', 'need help', 'what should i do',
            'i dont know', "i don't know", 'lost', 'confused',
            'what now', 'what next', 'how to feel', 'how to be',
            'tired of', 'sick of', 'had enough', 'cant take', "can't take"
        ]
        
        if any(phrase in lower_msg for phrase in emotional_phrases):
            responses = [
                "I hear that you're feeling lost and unsure what to do. That's a really difficult place to be. When everything feels broken, sometimes the bravest thing is just to breathe through one moment at a time.",
                "Thank you for reaching out even when you're feeling broken. I want you to know that your feelings are completely valid. It's okay to not have all the answers right now.",
                "I'm here with you in this painful moment. When we feel broken, it can be hard to know what step to take next. Sometimes just naming the feeling is a powerful first step."
            ]
            return random.choice(responses)
        
        # --- 4. Generic gentle guidance for ambiguous/short non-emotional messages ---
        guidance_responses = [
            "I'm here specifically to offer emotional support. If you're going through something difficult emotionally or just need someone to talk to about your feelings, I'm here to listen.",
            "My purpose is to be here for emotional support when you're feeling overwhelmed, sad, anxious, or just need someone to talk to. I'd be happy to listen if you want to share how you're feeling.",
            "I specialize in helping people process their emotions and find their way through difficult feelings. If there's something emotional you'd like to talk about, I'm here to support you."
        ]
        
        return random.choice(guidance_responses)
    
    def _get_crisis_response(self):
        """Crisis response in flowing sentences (omitted for brevity)"""
        return """I hear the depth of your pain right now and I want you to know your life matters deeply. This is a serious situation that requires immediate professional support.

Please reach out to a crisis helpline right now. In the Philippines, you can call the National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673. These lines are available 24/7 with trained professionals who can help.

If you're in immediate danger, please go to the nearest hospital or call 911. Tell someone you trust exactly how you're feeling. You don't have to go through this alone. Help is available and things can get better with the right support. Please make that call now."""
    
    def _get_fallback_response(self, sentiment):
        """Natural, flowing fallback responses, updated to include 'struggling'."""
        responses = {
            'positive': [
                "It's wonderful to hear you're feeling positive today. Savor these good moments and consider what's bringing you joy right now.",
                "I'm so glad you're experiencing positive emotions. These moments are precious—try to really soak them in and appreciate what's making you feel this way.",
                "That's really great to hear. When we have positive feelings, it helps to acknowledge them fully. What do you think is contributing to your good mood today?"
            ],
            'negative': [
                "I hear the pain in your words, and I want you to know your feelings are completely valid. It takes courage to share when you're hurting like this.",
                "Thank you for trusting me with how you're feeling. When emotions feel heavy, sometimes just taking a few deep breaths can create a little space around them.",
                "I'm here with you in this difficult moment. Remember that feelings like these are temporary, even when they don't feel that way right now. You're not alone."
            ],
            'struggling': [
                "It's a great choice to look for direction! Maybe we can start by setting an intention for the next hour, or focusing on one small positive habit you can complete right now. You've got this.",
                "Looking for a way to start the day is a sign of strength. Let's find one small, simple goal—something you can easily check off—to build momentum and guide your day forward.",
                "I sense you're looking for a little direction, and that's totally understandable when the day feels big. We can take this one small, manageable step at a time, just focusing on finding a productive rhythm."
            ],
            'neutral': [
                "Thanks for checking in. Sometimes our emotions are subtle and that's perfectly okay. What's one small thing you're noticing about how you feel today?",
                "I'm here to listen whenever you want to explore your feelings. Even neutral emotions can tell us something about what we need right now.",
                "It's okay to not feel strongly one way or another. Our emotional landscape changes throughout the day. Is there anything you'd like to share about what's on your mind?"
            ]
        }
        
        return random.choice(responses.get(sentiment, responses['struggling']))
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate natural wellness recommendations (omitted for brevity)"""
        try:
            if not mood_history:
                return "Checking in with your emotions regularly helps you understand your own patterns and needs."
            
            latest_mood = mood_history[-1]['mood'] if mood_history else 'neutral'
            
            recommendations = {
                'positive': "When you're feeling good, try to really soak in those positive emotions. You might consider writing down what brought you joy today.",
                'negative': "Be gentle with yourself during difficult times. Even taking three mindful breaths can create a little space around hard feelings.",
                'struggling': "Remember the power of small wins. Focus on completing just one manageable task today to build momentum.",
                'neutral': "Tune into the subtle feelings that might be present. Sometimes just noticing without judgment can be helpful."
            }
            
            return recommendations.get(latest_mood, "Take a moment to check in with how you're feeling today. Your emotional wellbeing matters.")
        
        except Exception as e:
            return "Be kind to yourself today. Your emotional wellbeing matters."