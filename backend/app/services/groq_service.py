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
            
        # Store conversation history per user
        self.conversation_histories = {}
    
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
            'website', 'app', 'software', 'assignment', 'homework', 'project', 
            'solve for', 'formula', 'calculate', 'math', 'physics', 'chemistry', 
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
    
    def analyze_sentiment(self, message):
        """Analyze sentiment by returning the single highest-priority intent"""
        detected = self._match_intent_keywords(message)
        
        # Iterate through intent_map in priority order
        for intent_type in self.intent_map.keys():
            if intent_type == 'negative':
                lower_message = message.lower()
                struggle_keywords = [
                    'what to do', 'what should i do', 'how to face', 'how to start',
                    'how to get through', 'i need direction', 'i need motivation',
                    'i dont know', "i don't know", 'lost', 'confused', 'stuck',
                    'what now', 'what next', 'how can i', 'why do i feel'
                ]
                
                # Check for "struggling" intent
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
            
            # Handle special sentiments with predefined responses (skip Groq API)
            special_sentiments = ['crisis', 'creator', 'grateful', 'goodbye', 'greeting']
            
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
            
            # For emotional support topics, use Groq API
            if self.client and self.is_emotional_support_topic(user_message):
                response = self._generate_groq_response(user_message, sentiment, user_id)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            else:
                if not self.is_emotional_support_topic(user_message):
                    response = self._get_gentle_guidance(user_message)
                else:
                    response = self._get_fallback_response(sentiment)
                
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
        
        except Exception as e:
            logger.error(f"Error generating response: {e}")
            response = self._get_fallback_response(sentiment)
            return response
    
    def _generate_groq_response(self, user_message, sentiment, user_id):
        """Generate response using Groq with conversation context"""
        try:
            # Get conversation history
            history = self.get_conversation_history(user_id)
            
            # Build context from history
            context_messages = []
            if history:
                for entry in history[-6:]:  # Last 6 messages (3 exchanges)
                    role_map = {"user": "user", "assistant": "assistant"}
                    context_messages.append({
                        "role": role_map.get(entry["role"], "user"),
                        "content": entry["message"]
                    })
            
            # Get user insights
            insights = self.get_personalized_insights(user_id)
            insights_text = ""
            if insights:
                insights_text = f"\n\nUser patterns: Recently feeling {insights['most_common_mood']} (avg intensity: {insights['average_intensity']}/10). Trend: {insights['trend']}."
            
            # System prompt
            system_prompt = f"""You are Calmi, a warm, supportive, and practical emotional companion. You provide both emotional support AND actionable advice.

Respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

IMPORTANT CAPABILITIES:
1. Validate feelings with appropriate empathy
2. Show genuine empathy and presence
3. Remember and reference previous context
4. Offer practical, evidence-based advice when appropriate
5. Suggest coping strategies naturally
6. Provide gentle guidance for next steps

Tailor the tone based on the user's sentiment:
* **'negative'**: Use **deep empathy**, validation of pain, and gentle acceptance. Reference any previous context they shared (like family issues, relationships, etc.).
* **'struggling'**: Use a **motivational, directional, and high-agency tone**. Acknowledge they are seeking a **starting point or positive perspective**. Focus on small, manageable actions, building positive habits, or choosing a focus for the hour/day. **Do not use overly dramatic language, apologize, or assume the user is sad/overwhelmed if they ask for direction.** Keep the tone light, encouraging, and respectful of their ability to cope.
* **'positive'**: Acknowledge and encourage savoring the good mood.

No advice about non-emotional topics. Always be a friend, never a therapist.

Respond with natural, flowing sentences that show appropriate empathy, reference previous conversation context when relevant, and offer real, grounded emotional support. No colons, no lists, just warm, compassionate conversation."""

            # Build messages for Groq API
            messages = [
                {"role": "system", "content": system_prompt},
            ]
            
            # Add conversation history
            if history:
                for entry in history[-6:]:  # Last 6 messages
                    role = "user" if entry["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": entry["message"]})
            
            # Add current user message with sentiment context
            current_message = f"The user's current sentiment is **'{sentiment}'**.\nThey say: \"{user_message}\""
            messages.append({"role": "user", "content": current_message})
            
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=300,  # Increased for more contextual responses
                temperature=0.75,
                top_p=0.95,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )
            
            if response.choices and response.choices[0].message.content:
                text = response.choices[0].message.content.strip()
                text = text.replace(':', '.').replace('•', '').replace('-', '')
                if not text.endswith(('.', '!', '?')):
                    text = text + '.'
                return text
            
            return self._get_fallback_response(sentiment)
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            return self._get_fallback_response(sentiment)
    
    def _get_gentle_guidance(self, user_message):
        """For non-emotional messages, provide warm redirection"""
        lower_msg = user_message.lower()
        
        task_keywords = ['assignment', 'homework', 'project', 'studying']
        if any(keyword in lower_msg for keyword in task_keywords):
            return "That sounds important! While I focus on emotional support, I'm cheering you on. What are you feeling about this task?"

        technical_keywords = ['code', 'python', 'javascript', 'math']
        if any(keyword in lower_msg for keyword in technical_keywords):
            return "I specialize in emotional support rather than technical topics. But I'm here if you want to talk about how you're feeling about this challenge!"

        return "I'm here for emotional support and mental wellness. If you're going through something difficult emotionally, I'm here to listen. What's on your mind?"
    
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
                "I hear how heavy this is. Take one slow breath. You don't have to fix everything at once. What feels hardest right now?",
                "Thank you for sharing. You're not alone in this. What's one small thing that might bring you relief in the next 30 minutes?"
            ],
            'struggling': [
                "Looking for direction shows strength. What's one small win you could achieve in the next hour?",
                "Let's start small. What's the first tiny action you could take today?"
            ],
            'neutral': [
                "I'm here to listen. What's on your mind today?",
                "Thanks for checking in. How are you feeling right now?"
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
                "I was created by Jhon Paul M. Nouiana and Ian Jhon C. Dosdos! They built me to be your emotional support companion. I'm grateful to them for giving me the ability to help you through your feelings."
            ]
        }
        
        return random.choice(responses.get(sentiment, responses['neutral']))
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate natural wellness recommendations"""
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
            logger.error(f"Error generating wellness recommendation: {e}")
            return "Be kind to yourself today. Your emotional wellbeing matters."