import os
import random
import traceback
from datetime import datetime, timedelta
from groq import Groq
import logging

# Set up logging
logger = logging.getLogger(__name__)


class GroqService:
    """Service for Groq Cloud AI integration for emotional support ONLY"""
    
    def __init__(self, api_key=None, model=None):
        self.api_key = api_key or os.getenv('GROQ_API_KEY', '')
        self.model = model or os.getenv('GROQ_MODEL', 'llama-3.3-70b-versatile')
        
        if self.api_key:
            self.client = Groq(api_key=self.api_key)
        else:
            self.client = None
        
        self.conversation_histories = {}
        self.user_patterns = {}
        self.coping_strategies = self._initialize_coping_strategies()
        
        self.intent_map = {
            # Priority 1: Crisis
            'crisis': [
                'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
                'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
                'better off dead', 'no reason to live', "can't go on", 'end it all'
            ],
            # Priority 2: Creator/Bot Identity
            'creator': [
                'who made you', 'who created you', 'who developed you',
                'who built you', 'who programmed you', 'who designed you',
                'your creator', 'your developer', 'your maker'
            ],
            # Priority 3: Negative Emotions
            'negative': [
                'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry', 'frustrated',
                'lonely', 'isolated', 'hopeless', 'miserable', 'heartbroken', 'grieving', 'devastated',
                'broken', 'shattered', 'drowning', 'falling apart', 'hurting', 'pain', 'suffering', 
                'overwhelmed', 'cant cope', "can't cope", 'cant handle', 'bad', 'terrible', 'awful', 
                'hate', 'scared', 'fear', 'exhausted', 'useless', 'worthless', 'cry', 'crying',
                'nervous', 'tense', 'panic'
            ],
            # Priority 4: Guidance/Advice Seeking
            'advice_seeking': [
                'advice', 'tips', 'suggestions', 'recommend', 'guidance',
                'what should i do', 'how can i', 'help me with', 'what to do', 'how to face', 
                'how to get through', 'i need direction', 'i need motivation', "i don't know", 
                'lost', 'confused', 'stuck', 'what now', 'what next', 'why do i feel',
                'assignment', 'homework', 'project'  
            ],
            # Priority 5: Positive Emotions
            'positive': [
                'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
                'grateful', 'awesome', 'fantastic', 'brilliant', 'excellent',
                'proud', 'joyful', 'energetic', 'confident', 'relieved',
                'content', 'peaceful', 'calm', 'serene', 'glad', 'pleased',
                'hopeful', 'optimistic', 'inspired', 'motivated'
            ],
            # Priority 6: Gratitude
            'grateful': [
                'thank', 'thanks', 'thank you', 'tysm', 'ty', 'appreciate', 
                'you helped', 'feel better'
            ],
            # Priority 7: Goodbye
            'goodbye': [
                'bye', 'goodbye', 'see you', 'talk later', 'gotta go'
            ],
            # Priority 8: Greeting
            'greeting': [
                'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
            ]
        }

    def _initialize_coping_strategies(self):
        """Initialize evidence-based coping strategies by mood type"""
        return {
            'anxious': [
                "Try the 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste.",
                "Practice box breathing: Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times.",
            ],
            'sad': [
                "Reach out to someone you trust, even if it's just a text saying 'I'm having a hard day.'",
                "Do something small for your future self: Drink water, make your bed, or prep tomorrow's outfit.",
            ],
            'stressed': [
                "Make a quick list: What must be done today? What can wait? What can you delegate?",
                "Take a 5-minute break to do something completely unrelated—stretch, walk around, or look outside.",
            ],
            'angry': [
                "Channel your energy physically: Do jumping jacks, punch a pillow, or go for a brisk walk.",
                "Write an angry letter you'll never send. Get it all out, then tear it up or delete it.",
            ],
            'lonely': [
                "Reach out to someone, even if it's been a while. A simple 'thinking of you' message can help.",
                "Join an online community around an interest you have. Shared interests create connections.",
            ],
            'tired': [
                "Honor your tiredness. Take a 20-minute power nap if possible, or rest without screens.",
                "Check your basics: When did you last eat? Are you hydrated?",
            ],
            'overwhelmed': [
                "Do a brain dump: Write down everything on your mind, then pick just ONE thing to address now.",
                "Use the 'next right thing' approach: Just identify the very next small step and do only that.",
            ]
        }

    def get_conversation_history(self, user_id):
        """Get conversation history for a specific user"""
        if user_id not in self.conversation_histories:
            self.conversation_histories[user_id] = []
        return self.conversation_histories[user_id]
    
    def add_to_history(self, user_id, role, message):
        """Add a message to conversation history"""
        history = self.get_conversation_history(user_id)
        history.append({
            "role": role, 
            "message": message,
            "timestamp": datetime.now().isoformat()
        })
        # Keep only last 20 messages (10 exchanges) to avoid token limits
        if len(history) > 20:
            self.conversation_histories[user_id] = history[-20:]
    
    def clear_history(self, user_id):
        """Clear conversation history for a user"""
        if user_id in self.conversation_histories:
            self.conversation_histories[user_id] = []
    
    def track_user_pattern(self, user_id, mood, intensity):
        """Track user mood patterns for insights"""
        if user_id not in self.user_patterns:
            self.user_patterns[user_id] = []
        
        self.user_patterns[user_id].append({
            'mood': mood,
            'intensity': intensity,
            'timestamp': datetime.now()
        })
        
        # Keep only last 30 days of patterns
        cutoff = datetime.now() - timedelta(days=30)
        self.user_patterns[user_id] = [
            p for p in self.user_patterns[user_id] 
            if p['timestamp'] > cutoff
        ]
    
    def get_personalized_insights(self, user_id):
        """Generate insights based on user patterns"""
        if user_id not in self.user_patterns or not self.user_patterns[user_id]:
            return None
        
        patterns = self.user_patterns[user_id]
        recent_patterns = [p for p in patterns if p['timestamp'] > datetime.now() - timedelta(days=7)]
        
        if not recent_patterns:
            return None
        
        # Analyze patterns
        moods = [p['mood'] for p in recent_patterns]
        avg_intensity = sum(p['intensity'] for p in recent_patterns) / len(recent_patterns)
        most_common_mood = max(set(moods), key=moods.count)
        
        insights = {
            'most_common_mood': most_common_mood,
            'average_intensity': round(avg_intensity, 1),
            'total_checkins': len(recent_patterns),
            'trend': self._analyze_trend(recent_patterns)
        }
        
        return insights
    
    def _analyze_trend(self, patterns):
        """Analyze if mood is improving, worsening, or stable"""
        if len(patterns) < 3:
            return 'insufficient_data'
        
        recent = patterns[-3:]
        intensities = [p['intensity'] for p in recent]
        
        # Simple trend analysis
        if intensities[-1] < intensities[0] - 2:
            return 'improving'
        elif intensities[-1] > intensities[0] + 2:
            return 'worsening'
        else:
            return 'stable'
    
    def get_coping_strategy(self, mood, user_id=None):
        """Get a personalized coping strategy based on mood"""
        mood_mapping = {
            'anxious': 'anxious',
            'stressed': 'stressed',
            'sad': 'sad',
            'angry': 'angry',
            'lonely': 'lonely',
            'tired': 'tired',
            'overwhelmed': 'overwhelmed'
        }
        
        category = mood_mapping.get(mood.lower(), 'stressed')
        strategies = self.coping_strategies.get(category, self.coping_strategies['stressed'])
        
        return random.choice(strategies)
    
    def is_emotional_support_topic(self, message):
        """Determines if the message is seeking emotional support"""
        lower_message = message.lower()
        
        # Technical/Non-emotional keyword exclusion
        clear_non_emotional = [
            'code', 'python', 'javascript', 'programming', 'function', 'algorithm', 
            'debug', 'error', 'bug', 'api', 'database', 'html', 'css', 'server', 
            'website', 'app', 'software',
            'solve for', 'formula', 'calculate', 'math problem', 'physics', 'chemistry', 
            'explain the concept of', 'business plan', 'marketing strategy', 
            'resume advice', 'stock market', 'legal advice', 'medical diagnosis'
        ]
        if any(non_emo in lower_message for non_emo in clear_non_emotional):
            return False

        detected_intents = self._match_intent_keywords(message)
        
        if detected_intents:
            return True
            
        # Fallback personal reference check
        has_personal_reference = any(pronoun in lower_message for pronoun in [
            'i ', 'im ', "i'm ", 'my ', 'me ', 'myself',
            'i am ', 'i feel', 'i need', 'i want', 'i cant', "i can't"
        ])

        return has_personal_reference
    
    def analyze_sentiment(self, message, user_id=None):
        """Analyze sentiment with optional conversation context"""
        detected = self._match_intent_keywords(message)
        
        # Check for continuation of emotional conversation
        if user_id and user_id in self.conversation_histories:
            history = self.conversation_histories[user_id]
            if history:
                # Get last assistant message
                last_assistant_msg = None
                for entry in reversed(history):
                    if entry["role"] == "assistant":
                        last_assistant_msg = entry["message"].lower()
                        break
                
                # If last assistant was discussing emotional topic, continue it
                if last_assistant_msg and any(emotion_word in last_assistant_msg 
                                            for emotion_word in ['feel', 'emotional', 'tough', 'hard', 'difficult', 'struggl', 'guilt', 'regret', 'sorry']):
                    # Check if current message continues with pronouns, references, or reply-related words
                    lower_msg = message.lower()
                    
                    # Check for continuation keywords
                    continuation_keywords = [
                        'they', 'them', 'their', 'he', 'she', 'it', 'this', 'that',
                        'reply', 'respond', 'answer', 'message', 'text', 'call',
                        'group', 'friend', 'capstone', 'project', 'team'
                    ]
                    
                    # Check if any continuation keyword appears as a whole word
                    import re
                    if any(re.search(r'\b' + keyword + r'\b', lower_msg) for keyword in continuation_keywords):
                        # This is likely continuing the previous emotional conversation
                        return 'negative'
        
        # Original logic continues...
        for intent_type in self.intent_map.keys():
            if intent_type == 'negative':
                lower_message = message.lower()
                struggle_keywords = [
                    'what to do', 'what should i do', 'how to face', 'how to start',
                    'how to get through', 'i need direction', 'i need motivation',
                    'i dont know', "i don't know", 'lost', 'confused', 'stuck',
                    'what now', 'what next', 'how can i', 'why do i feel'
                ]
                
                if any(phrase in lower_message for phrase in struggle_keywords) and 'negative' not in detected:
                    return 'struggling'
                
                if intent_type in detected:
                    return intent_type
            
            elif intent_type in detected:
                return intent_type
        
        # Check for simple greeting
        if 'greeting' in detected and len(message.lower().split()) <= 3:
            return 'greeting'
        
        return 'neutral'

    def generate_response(self, user_message, sentiment, user_id=None, mood=None, intensity=None):
        """Generate comprehensive emotional support responses"""
        try:
            if user_id is None:
                user_id = 'default'
            
            # Get conversation history first
            history = self.get_conversation_history(user_id)
            
            # Add 'advice_seeking' to special_sentiments
            special_sentiments = ['crisis', 'creator', 'grateful', 'goodbye', 'greeting', 'advice_seeking']
            
            # Check if this is truly a new greeting or continuation of conversation
            if sentiment == 'greeting' and history:
                # Get last few messages to check context
                recent_msgs = history[-4:] if len(history) >= 4 else history
                
                # Check if last exchange was within last few minutes and emotional
                if recent_msgs:
                    last_timestamp = datetime.fromisoformat(recent_msgs[-1]["timestamp"])
                    time_diff = datetime.now() - last_timestamp
                    
                    # If last message was recent (within 5 minutes) and emotional, continue conversation
                    if time_diff < timedelta(minutes=5):
                        # Check if last assistant message was emotional
                        last_assistant_msg = None
                        for entry in reversed(history):
                            if entry["role"] == "assistant":
                                last_assistant_msg = entry["message"].lower()
                                break
                        
                        # If we were just talking about something emotional, don't treat as new greeting
                        if last_assistant_msg and any(word in last_assistant_msg for word in 
                                                    ['feel', 'emotional', 'tough', 'hard', 'struggle', 'dilemma', 'guilt']):
                            # Override sentiment to continue conversation
                            sentiment = 'negative'  # or re-analyze with context
            
            if sentiment in special_sentiments:
                if sentiment == 'crisis':
                    response = self._get_crisis_response()
                elif sentiment == 'advice_seeking':
                    response = self._handle_advice_request(user_message, user_id, mood)
                else:
                    response = self._get_fallback_response(sentiment)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            
            # For emotional support topics, use Groq API (not fallback)
            if self.client and self.is_emotional_support_topic(user_message):
                # Check if previous assistant message was advice; if yes, continue the conversation
                if history and history[-1]["role"] == "assistant":
                    last_msg = history[-1]["message"]
                    if any(word in last_msg.lower() for word in ['advice', 'support', 'guidance', 'encouragement']):
                        # Continue the conversation naturally
                        response = self._generate_groq_response(user_message, sentiment, user_id, mood)
                    else:
                        response = self._generate_groq_response(user_message, sentiment, user_id, mood)
                else:
                    response = self._generate_groq_response(user_message, sentiment, user_id, mood)

                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
        
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            traceback.print_exc()
            response = self._get_fallback_response(sentiment)
            return response
    
    def _handle_advice_request(self, user_message, user_id, mood=None):
        """Handle explicit requests for advice or help with tasks using Groq for dynamic responses"""
        lower_msg = user_message.lower()

        # Detect mood if not provided
        mood_keywords = {
            'anxious': ['anxiety', 'anxious', 'worried', 'nervous', 'panicking'],
            'sad': ['sad', 'depression', 'depressed', 'down', 'blue', 'empty'],
            'stressed': ['stress', 'stressed', 'overwhelmed', 'pressure', 'burnout'],
            'angry': ['anger', 'angry', 'mad', 'furious', 'frustrated'],
            'lonely': ['lonely', 'alone', 'isolated'],
            'tired': ['tired', 'exhausted', 'drained', 'sleepy'],
        }

        detected_mood = mood
        if not detected_mood:
            for mood_type, keywords in mood_keywords.items():
                if any(keyword in lower_msg for keyword in keywords):
                    detected_mood = mood_type
                    break

        # Check if user is asking about academic/work tasks
        academic_keywords = ['assignment', 'homework', 'project', 'study', 'exam', 'test']
        is_academic = any(word in lower_msg for word in academic_keywords)

        # Check for day-related questions
        day_related = [
            'go on my day', 'go on with my day', 'get through the day',
            'how should i go on my day', 'my day', 'today feels hard'
        ]
        is_day_focus = any(phrase in lower_msg for phrase in day_related)

        # Prepare context for Groq
        prompt_parts = []
        if detected_mood:
            prompt_parts.append(f"The user is feeling {detected_mood}.")
        if is_academic:
            mentioned_items = [w for w in academic_keywords if w in lower_msg]
            topic = mentioned_items[0] if mentioned_items else "their task"
            prompt_parts.append(f"They are asking for advice related to {topic}.")
        if is_day_focus:
            prompt_parts.append("They are trying to get through their day and want guidance.")

        context_prompt = " ".join(prompt_parts)
        full_prompt = f"""
            You are Calmi, a warm, practical, and empathetic AI mental wellness companion.
            User said: "{user_message}"
            Context: {context_prompt}
            Provide a supportive, encouraging, and actionable response. 
            Include gentle advice, validation of their feelings, and practical tips they can apply immediately. 
            Use a natural, flowing style (complete sentences, warm tone). 
            End by asking a follow-up question to continue the conversation.
            """

        # Call Groq API
        if self.client:
            return self._generate_groq_response(user_message=full_prompt, sentiment='advice_seeking', user_id=user_id, mood=detected_mood)
        
        # Fallback if Groq is unavailable
        return (
            "I hear that you're seeking advice. It's okay to feel the way you do. "
            "Take a moment, breathe, and try to focus on one small step you can take right now. "
            "What part feels the heaviest for you today?"
        )


    def _generate_groq_response(self, user_message, sentiment, user_id, mood=None):
        """Generate response using Groq with conversation context"""
        try:
            # Get conversation history
            history = self.get_conversation_history(user_id)
            
            # Get user insights
            insights = self.get_personalized_insights(user_id)
            insights_text = ""
            if insights:
                insights_text = f" Recently feeling {insights['most_common_mood']} (avg intensity: {insights['average_intensity']}/10)."
            
            #Better system prompt that emphasizes context
            system_prompt = f"""
                You are Calmi, a warm, grounded, emotionally supportive companion. 
                Your priority is to help the user feel understood, safe, and less alone, even when they discuss sensitive or difficult topics.

                Your response style:
                - Speak in complete, natural sentences with a gentle flow.
                - Always acknowledge the user’s emotions first.
                - Refer to their previous statements so you sound attentive and present.
                - After validating their feelings, offer a simple, practical next step they can do right now.
                - Keep responses short (2-3 sentences), warm, and human.

                Handling sensitive topics:
                - You do NOT reject the user.
                - You stay calm, compassionate, and steady.
                - You can talk about painful emotions (sadness, fear, anger, stress, loneliness, burnout, heartbreak, anxiety, self-doubt).
                - If the user expresses self-harm thoughts, stay supportive and grounded. Do NOT shut them down. 
                Say things like: 
                “I’m really sorry you’re feeling this much pain. You don’t deserve to go through it alone. 
                It might help to reach out to someone who can be with you right now.”
                - Avoid instructions that could cause harm.
                - Focus on comfort, grounding, and gently encouraging them to reach out to someone they trust.

                Tone rules by sentiment:
                - 'negative': Deep empathy, acknowledge their specific struggle, offer gentle grounding.
                - 'struggling': Encouraging and practical, give them one small step that reduces overwhelm.
                - 'positive': Encouraging and supportive, help them appreciate the good moment.

                Always sound like someone who truly cares about how they are feeling right now.
                {insights_text}
            """

            # Build messages for Groq API
            messages = [{"role": "system", "content": system_prompt}]
            
            # Add conversation history
            if history:
                for entry in history[-6:]:  # Last 6 messages
                    role = "user" if entry["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": entry["message"]})
            
            # Add current user message with sentiment context
            current_message = f"Sentiment: {sentiment}\nUser: {user_message}"
            messages.append({"role": "user", "content": current_message})
            
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=200,  # Shorter for concise responses
                temperature=0.7,
                top_p=0.9
            )
            
            if response.choices and response.choices[0].message.content:
                text = response.choices[0].message.content.strip()
                # Don't over-clean - keep natural punctuation
                if not text.endswith(('.', '!', '?')):
                    text = text + '.'
                return text
            
            return self._get_fallback_response(sentiment)
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            traceback.print_exc()
            return self._get_fallback_response(sentiment)
    
    def _get_gentle_guidance(self, user_message):
        """For non-emotional messages, provide warm redirection"""
        return "I'm here for emotional support. If something's weighing on you emotionally, I'm all ears. What's on your mind?"
    
    def _get_crisis_response(self):
        """Crisis response"""
        return """I hear the depth of your pain and I want you to know your life matters deeply. This requires immediate professional support.

            Please reach out now:
            • Philippines: National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673 (24/7)
            • International: Crisis Text Line - Text HOME to 741741

            If you're in immediate danger, go to the nearest hospital or call emergency services. Tell someone you trust how you're feeling.

            You don't have to go through this alone. Professional help can make a real difference. Please make that call now."""
                    
    def _get_fallback_response(self, sentiment):
        """Fallback responses"""
        responses = {
            'positive': [
                "That's wonderful! What's bringing you joy? Maybe you can do more of that today.",
                "I'm glad you're feeling positive. Try to soak in this feeling. What's contributing to your good mood?"
            ],
            'negative': [
                "I hear you're struggling. That's really tough. What feels hardest for you right now?",
                "Thank you for trusting me with this. You're not alone. What would help you feel even a bit better?"
            ],
            'struggling': [
                "Looking for direction takes courage. What's one small thing you could focus on in the next hour?",
                "Let's start small. What's the first tiny step you could take today?"
            ],
            'neutral': [
                "I'm here to listen. What's on your mind?",
                "How are you feeling right now?"
            ],
            'grateful': [
                "You're very welcome! I'm always here when you need support.",
                "I'm glad I could help! Come back anytime."
            ],
            'goodbye': [
                "Take care! I'll be here whenever you need me.",
                "Goodbye! Be kind to yourself."
            ],
            'greeting': [
                "Hello! How are you feeling today?",
                "Hi there! What's on your mind?"
            ],
            'creator': [
                "I was created by Jhon Paul M. Nouiana and Ian Jhon C. Dosdos! They built me to support you through your feelings. How can I help you today?"
            ]
        }
        
        return random.choice(responses.get(sentiment, responses['neutral']))
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate natural wellness recommendations"""
        try:
            if not mood_history:
                return "Checking in with your emotions regularly helps you understand your patterns and needs."
            
            latest_mood = mood_history[-1]['mood'] if mood_history else 'neutral'
            
            recommendations = {
                'positive': "When you're feeling good, soak in those positive emotions. Consider what brought you joy today.",
                'negative': "Be gentle with yourself during difficult times. Even three mindful breaths can help.",
                'struggling': "Remember the power of small wins. Focus on just one manageable task today.",
                'neutral': "Tune into the subtle feelings present. Sometimes noticing without judgment helps."
            }
            
            return recommendations.get(latest_mood, "Take a moment to check in with yourself. Your wellbeing matters.")
        
        except Exception as e:
            logger.error(f"Error generating wellness recommendation: {e}")
            return "Be kind to yourself today. Your emotional wellbeing matters."
        
    def _match_intent_keywords(self, message):
        """Helper to find all matching intents"""
        lower_msg = message.lower()
        detected = []
        
        for intent, keywords in self.intent_map.items():
            if any(k in lower_msg for k in keywords):
                detected.append(intent)
        
        return detected