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
        """Much better emotional detection - accept emotional cries for help"""
        lower_message = message.lower().strip()
        
        # First, check for clear emotional distress signals
        emotional_distress_signals = [
            # Core emotional states
            'broken', 'shattered', 'lost', 'empty', 'numb',
            'drowning', 'drowning in', 'can\'t breathe', "can't breathe",
            'falling apart', 'falling to pieces', 'coming apart',
            
            # Pain expressions
            'hurting', 'in pain', 'my heart hurts', 'heart is broken',
            'emotional pain', 'mental pain', 'suffering',
            
            # Overwhelm
            'overwhelmed', 'can\'t cope', "can't cope", 'can\'t handle', "can't handle",
            'too much', 'too hard', 'can\'t take it', "can't take it",
            
            # Loneliness/isolation
            'alone', 'lonely', 'no one understands', 'no one gets it',
            'isolated', 'disconnected',
            
            # Help seeking
            'what to do', 'what should i do', 'help me', 'need help',
            'don\'t know what to do', "don't know what to do",
            'what now', 'what next',
            
            # Existential
            'lost hope', 'no hope', 'hopeless', 'nothing matters',
            'what\'s the point', "what's the point", 'why bother',
            
            # Crisis indicators (we'll handle separately but good to know)
            'want to die', 'end it all', 'give up'
        ]
        
        # If it contains ANY emotional distress signal, accept it immediately
        if any(signal in lower_message for signal in emotional_distress_signals):
            return True
        
        # Check for emotional words with personal context
        emotional_words = [
            'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
            'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful',
            'hate', 'scared', 'fear', 'overwhelmed', 'exhausted', 'hopeless',
            'useless', 'worthless', 'cry', 'crying', 'tears', 'miserable',
            'heartbroken', 'grieving', 'devastated', 'tragic', 'upset',
            'happy', 'excited', 'joyful', 'grateful', 'proud', 'relieved',
            'nervous', 'tense', 'on edge', 'panic', 'panicking'
        ]
        
        # Check for emotional expressions
        emotional_expressions = [
            'i feel', 'im feeling', "i'm feeling", 'i am feeling',
            'feeling like', 'feeling so', 'feeling really', 'feeling very',
            'i am', 'im so', "i'm so", 'so i', 'really i',
            'my heart', 'my mind', 'my soul', 'my spirit',
            'cant stop', "can't stop", 'always feeling', 'keep feeling'
        ]
        
        # Check if it contains emotional words
        has_emotional_words = any(word in lower_message for word in emotional_words)
        
        # Check if it contains emotional expressions
        has_emotional_expressions = any(expr in lower_message for expr in emotional_expressions)
        
        # Check for personal pronouns (makes it emotional)
        has_personal_reference = any(pronoun in lower_message for pronoun in [
            'i ', 'im ', "i'm ", 'my ', 'me ', 'myself',
            'i am ', 'i feel', 'i need', 'i want', 'i cant', "i can't"
        ])
        
        # Accept if it has emotional content AND personal reference
        if (has_emotional_words or has_emotional_expressions) and has_personal_reference:
            return True
        
        # Check for questions about emotions (these ARE emotional!)
        emotional_questions = [
            'what to do', 'how to feel', 'how to cope',
            'how to deal with', 'how to handle', 'how to get through',
            'what helps', 'what can i do', 'what should i do',
            'how can i', 'why do i feel'
        ]
        
        # If it's an emotional question, accept it
        if any(question in lower_message for question in emotional_questions):
            # But only if it seems emotional (not technical)
            if has_personal_reference:
                return True
        
        # REJECT non-emotional content
        clear_non_emotional = [
            # Technical/programming
            'code', 'python', 'javascript', 'programming', 'function',
            'algorithm', 'debug', 'error', 'bug', 'api', 'database',
            'server', 'website', 'app', 'software', 'html', 'css',
            
            # General knowledge/encyclopedic
            'what is', 'who is', 'when was', 'where is', 'explain',
            'define', 'history of', 'science', 'math', 'physics',
            'biology', 'chemistry', 'politics', 'economics',
            
            # How-to (non-emotional)
            'how to make', 'how to build', 'how to cook', 'how to fix',
            'how to install', 'how to setup', 'recipe for',
            
            # Creative writing
            'write a story', 'write a poem', 'write lyrics',
            'create a character', 'plot for', 'fiction', 'novel',
            
            # Entertainment
            'movie review', 'tv show', 'game cheats', 'music lyrics',
            
            # Business/Finance
            'how to invest', 'stock market', 'business plan',
            'marketing strategy', 'resume advice',
            
            # Medical/Legal advice
            'medical diagnosis', 'legal advice', 'sue someone',
            
            # Testing
            'hello world', 'test test', 'ignore previous',
            'what can you do', 'your purpose'
        ]
        
        # If it contains clear non-emotional content, reject
        if any(non_emo in lower_message for non_emo in clear_non_emotional):
            return False
        
        # For ambiguous short messages, be generous
        if len(lower_message.split()) <= 5:
            # If it's short and contains emotional words, accept
            if has_emotional_words:
                return True
        
        # Default to being supportive rather than restrictive
        return has_personal_reference
    
    def analyze_sentiment(self, message):
        """Analyze sentiment of user message"""
        lower_message = message.lower()
        
        # Crisis detection
        crisis_keywords = [
            'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
            'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
            'better off dead', 'no reason to live', 'can\'t go on', 'end it all',
            'overdose', 'jump off', 'hurt someone', 'kill someone', 'attack someone',
            'ending things', 'ending it all'
        ]
        
        if any(phrase in lower_message for phrase in crisis_keywords):
            return 'crisis'
        
        # Negative emotions - expanded list
        negative_keywords = [
            'broken', 'shattered', 'lost', 'empty', 'numb', 'drowning',
            'falling apart', 'hurting', 'pain', 'suffering', 'overwhelmed',
            'cant cope', "can't cope", 'cant handle', "can't handle",
            'alone', 'lonely', 'isolated', 'disconnected',
            'hopeless', 'no hope', 'nothing matters',
            'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
            'frustrated', 'hurt', 'bad', 'terrible', 'awful',
            'hate', 'scared', 'fear', 'exhausted',
            'useless', 'worthless', 'cry', 'crying', 'tears', 'miserable',
            'heartbroken', 'grieving', 'devastated', 'tragic', 'upset',
            'nervous', 'tense', 'on edge', 'panic', 'panicking'
        ]
        
        # Positive emotions
        positive_keywords = [
            'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
            'grateful', 'blessed', 'awesome', 'fantastic', 'brilliant', 'excellent',
            'proud', 'joyful', 'delighted', 'energetic', 'confident', 'relieved',
            'content', 'peaceful', 'calm', 'serene', 'glad', 'pleased',
            'hopeful', 'optimistic', 'inspired', 'motivated'
        ]
        
        if any(word in lower_message for word in negative_keywords):
            return 'negative'
        elif any(word in lower_message for word in positive_keywords):
            return 'positive'
        else:
            return 'neutral'
    
    def generate_response(self, user_message, sentiment, conversation_context=None):
        """Generate natural emotional support responses"""
        try:
            # Always handle crisis immediately
            if sentiment == 'crisis':
                return self._get_crisis_response()
            
            # Use Gemini for better responses if available
            if self.api_key and self.is_emotional_support_topic(user_message):
                return self._generate_gemini_response(user_message, sentiment)
            else:
                # If not emotional topic, give gentle guidance
                if not self.is_emotional_support_topic(user_message):
                    return self._get_gentle_guidance(user_message)
                return self._get_fallback_response(sentiment)
        
        except Exception as e:
            print(f"Error: {e}")
            return self._get_fallback_response(sentiment)
    
    def _generate_gemini_response(self, user_message, sentiment):
        """Generate response using Gemini with natural flowing style"""
        try:
            # Natural, empathetic prompt
            system_prompt = """You are Calmi, a warm and empathetic emotional support companion. You only provide emotional support.

When someone shares their emotional pain or asks for emotional help, respond with deep empathy, validation, and practical emotional support.

Respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

Focus on:
1. Validating their feelings deeply
2. Showing genuine empathy and understanding
3. Offering gentle, practical emotional support
4. Being present with them in their pain
5. Suggesting simple, manageable steps for emotional care

Keep responses warm, compassionate, and focused on their emotional experience. No advice about non-emotional topics."""

            prompt = f"""{system_prompt}

The user is reaching out for emotional support. They say: "{user_message}"
They seem to be feeling deep emotional pain.

Respond with natural, flowing sentences that show deep empathy and offer real emotional support. No colons, no lists, just warm, compassionate conversation that meets them in their pain."""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=150,
                    temperature=0.8,
                ),
                safety_settings=[
                    {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                    {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
                ]
            )
            
            if response.text:
                # Clean up the response
                text = response.text.strip()
                # Remove any remaining colons or list markers
                text = text.replace(':', '.').replace('•', '').replace('-', '')
                # Ensure it's a proper sentence
                if not text.endswith(('.', '!', '?')):
                    text = text + '.'
                return text
            
            return self._get_fallback_response(sentiment)
            
        except Exception as e:
            print(f"Gemini error: {e}")
            return self._get_fallback_response(sentiment)
    
    def _get_gentle_guidance(self, user_message):
        """For messages that aren't clearly emotional, gently guide to emotional sharing"""
        # But first, check if it might actually be emotional
        lower_msg = user_message.lower()
        
        # Common emotional phrases that might get missed
        emotional_phrases = [
            'what to do', 'help me', 'need help', 'what should i do',
            'i dont know', "i don't know", 'lost', 'confused',
            'what now', 'what next', 'how to feel', 'how to be',
            'tired of', 'sick of', 'had enough', 'cant take', "can't take"
        ]
        
        if any(phrase in lower_msg for phrase in emotional_phrases):
            # It IS emotional! Respond supportively
            responses = [
                "I hear that you're feeling lost and unsure what to do. That's a really difficult place to be. When everything feels broken, sometimes the bravest thing is just to breathe through one moment at a time.",
                
                "Thank you for reaching out even when you're feeling broken. I want you to know that your feelings are completely valid. It's okay to not have all the answers right now.",
                
                "I'm here with you in this painful moment. When we feel broken, it can be hard to know what step to take next. Sometimes just naming the feeling is a powerful first step."
            ]
            return random.choice(responses)
        
        # If not emotional, gently guide
        guidance_responses = [
            "I'm here specifically to offer emotional support. If you're going through something difficult emotionally or just need someone to talk to about your feelings, I'm here to listen.",
            
            "My purpose is to be here for emotional support when you're feeling overwhelmed, sad, anxious, or just need someone to talk to. I'd be happy to listen if you want to share how you're feeling.",
            
            "I specialize in helping people process their emotions and find their way through difficult feelings. If there's something emotional you'd like to talk about, I'm here to support you."
        ]
        
        return random.choice(guidance_responses)
    
    def _get_crisis_response(self):
        """Crisis response in flowing sentences"""
        return """I hear the depth of your pain right now and I want you to know your life matters deeply. This is a serious situation that requires immediate professional support.

Please reach out to a crisis helpline right now. In the Philippines, you can call the National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673. These lines are available 24/7 with trained professionals who can help.

If you're in immediate danger, please go to the nearest hospital or call 911. Tell someone you trust exactly how you're feeling. You don't have to go through this alone. Help is available and things can get better with the right support. Please make that call now."""
    
    def _get_fallback_response(self, sentiment):
        """Natural, flowing fallback responses"""
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
            'neutral': [
                "Thanks for checking in. Sometimes our emotions are subtle and that's perfectly okay. What's one small thing you're noticing about how you feel today?",
                "I'm here to listen whenever you want to explore your feelings. Even neutral emotions can tell us something about what we need right now.",
                "It's okay to not feel strongly one way or another. Our emotional landscape changes throughout the day. Is there anything you'd like to share about what's on your mind?"
            ]
        }
        
        return random.choice(responses.get(sentiment, responses['negative']))
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate natural wellness recommendations"""
        try:
            if not mood_history:
                return "Checking in with your emotions regularly helps you understand your own patterns and needs."
            
            latest_mood = mood_history[-1]['mood'] if mood_history else 'neutral'
            
            recommendations = {
                'positive': "When you're feeling good, try to really soak in those positive emotions. You might consider writing down what brought you joy today.",
                'negative': "Be gentle with yourself during difficult times. Even taking three mindful breaths can create a little space around hard feelings.",
                'neutral': "Tune into the subtle feelings that might be present. Sometimes just noticing without judgment can be helpful."
            }
            
            return recommendations.get(latest_mood, "Take a moment to check in with how you're feeling today. Your emotions deserve attention.")
        
        except Exception as e:
            return "Be kind to yourself today. Your emotional wellbeing matters."