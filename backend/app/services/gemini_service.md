
requriements
google-ai-generativelanguage==0.6.5
google-api-core==2.28.1
google-api-python-client==2.187.0
google-auth==2.43.0
google-auth-httplib2==0.2.1
google-genai==1.52.0
google-generativeai==0.7.0
googleapis-common-protos==1.72.0


import google.generativeai as genai
import os
import random
import traceback
from datetime import datetime, timedelta


# class GeminiService:
"""Enhanced service for Gemini AI integration for comprehensive emotional support"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        if self.api_key:
            genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Store conversation history per user
        self.conversation_histories = {}
        
        # Track user patterns for personalized support
        self.user_patterns = {}
        
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
            # Priority 3: Negative Emotions (for sentiment) and specific mood types (for coping)
            'negative': [
                'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry', 'frustrated',
                'lonely', 'isolated', 'hopeless', 'miserable', 'heartbroken', 'grieving', 'devastated',
                'broken', 'shattered', 'drowning', 'falling apart', 'hurting', 'pain', 'suffering', 
                'overwhelmed', 'cant cope', "can't cope", 'cant handle', 'bad', 'terrible', 'awful', 
                'hate', 'scared', 'fear', 'exhausted', 'useless', 'worthless', 'cry', 'crying',
                'nervous', 'tense', 'panic'
            ],
            # Priority 4: Guidance/Advice Seeking (General/Struggling)
            'advice_seeking': [
                'advice', 'tips', 'suggestions', 'recommend', 'guidance',
                'what should i do', 'how can i', 'help me with', 'what to do', 'how to face', 
                'how to get through', 'i need direction', 'i need motivation', "i don't know", 
                'lost', 'confused', 'stuck', 'what now', 'what next', 'why do i feel'
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

        # Coping strategies database
        self.coping_strategies = self._initialize_coping_strategies()
    
    def _initialize_coping_strategies(self):
        """Initialize evidence-based coping strategies by mood type"""
        return {
            'anxious': [
                "Try the 5-4-3-2-1 grounding technique: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, and 1 you taste. This helps anchor you in the present moment.",
                "Practice box breathing: Breathe in for 4 counts, hold for 4, exhale for 4, hold for 4. Repeat 4 times. This activates your body's relaxation response.",
                "Write down your worries for 10 minutes, then set the paper aside. Sometimes getting anxious thoughts out of your head and onto paper helps reduce their intensity.",
                "Try progressive muscle relaxation: Tense and release each muscle group from your toes to your head. This helps release physical tension that often accompanies anxiety."
            ],
            'sad': [
                "Reach out to someone you trust, even if it's just a text saying 'I'm having a hard day.' Connection can help, even in small doses.",
                "Do something small for your future self: Drink water, make your bed, or prep tomorrow's outfit. These tiny acts of self-care can help shift your energy.",
                "Allow yourself to feel sad without judgment. Set a timer for 15 minutes to fully feel your emotions, then gently redirect to a small activity.",
                "Listen to music that matches your mood first, then gradually shift to slightly more uplifting songs. This validates your feelings while gently lifting your spirits."
            ],
            'stressed': [
                "Make a quick list: What must be done today? What can wait? What can you delegate? Sometimes clarity reduces stress more than action.",
                "Take a 5-minute break to do something completely unrelated to your stressors—stretch, walk around, or look at something beautiful outside.",
                "Practice the 'worry dump': Write everything stressing you out without filtering. Then circle only what you can control today and focus there.",
                "Try a body scan meditation for just 5 minutes. Stress often lives in our bodies—noticing where you hold tension is the first step to releasing it."
            ],
            'angry': [
                "Channel your energy physically: Do jumping jacks, punch a pillow, or go for a brisk walk. Physical movement helps process anger constructively.",
                "Write an angry letter you'll never send. Get all your feelings out uncensored, then tear it up or delete it. This releases the emotion safely.",
                "Ask yourself: What boundary was crossed? What do I need? Anger often signals that something important to you needs attention.",
                "Count to 10 while breathing deeply, or splash cold water on your face. These interrupt your anger response and help you respond rather than react."
            ],
            'lonely': [
                "Reach out to someone, even if it's been a while. A simple 'thinking of you' message can reconnect you and might mean more to them than you think.",
                "Join an online community around an interest you have. Shared interests create natural conversation and connection points.",
                "Practice self-companionship: Talk to yourself kindly like you would a good friend. You can be a source of comfort for yourself.",
                "Consider volunteering or helping someone else. Paradoxically, giving connection often helps us feel less alone."
            ],
            'tired': [
                "Honor your tiredness. Take a 20-minute power nap if possible, or simply rest without screens for 15 minutes.",
                "Check your basics: When did you last eat? Are you hydrated? Sometimes 'tired' is our body asking for fuel or water.",
                "Do a gentle energy assessment: Is this physical tiredness (needing rest) or emotional exhaustion (needing boundaries)? The solution differs for each.",
                "Practice saying no to one thing today. Tiredness often signals we're doing too much."
            ],
            'overwhelmed': [
                "Do a brain dump: Write down everything on your mind for 5 minutes without organizing. Then pick just ONE thing to address now.",
                "Use the 'next right thing' approach: Don't think about the whole mountain. Just identify the very next small step and do only that.",
                "Create artificial boundaries: Set a timer for 25 minutes and work on one task, then take a 5-minute break. Breaking time into chunks makes overwhelm manageable.",
                "Ask for help with one specific thing. Name exactly what you need—people often want to help but don't know how."
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
        # Map common moods to strategy categories
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
        
        # Return a random strategy (could be made smarter with user preferences)
        return random.choice(strategies)
    
    # def is_emotional_support_topic(self, message):
    #     """Determines if the message is seeking emotional support"""
    #     lower_message = message.lower().strip()
        
    #     # Creator Questions
    #     creator_questions = [
    #         'who made you', 'who created you', 'who developed you',
    #         'who built you', 'who programmed you', 'who designed you',
    #         'your creator', 'your developer', 'your maker',
    #         'who are your creators', 'who are your developers',
    #         'made by', 'created by', 'developed by'
    #     ]
        
    #     if any(phrase in lower_message for phrase in creator_questions):
    #         return True
        
    #     # Advice/Help seeking (NEW)
    #     advice_seeking = [
    #         'advice', 'what should i', 'how can i', 'help me',
    #         'tips for', 'suggestions', 'recommend', 'guidance',
    #         'any ideas', 'what can i do', 'how to deal', 'how to cope',
    #         'how to handle', 'how to manage', 'what would you suggest'
    #     ]
        
    #     if any(phrase in lower_message for phrase in advice_seeking):
    #         return True
        
    #     # Gratitude & Casual Conversation
    #     gratitude_casual = [
    #         'thank', 'thanks', 'thank you', 'tysm', 'ty',
    #         'appreciate', 'grateful', 'you helped', 'you\'re helpful',
    #         'that helps', 'that helped', 'feel better',
    #         'bye', 'goodbye', 'see you', 'talk later', 'gotta go',
    #         'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
    #     ]
        
    #     if any(phrase in lower_message for phrase in gratitude_casual):
    #         return True
        
    #     # Core Emotional Distress & Guidance Seeking
    #     emotional_distress_signals = [
    #         'broken', 'shattered', 'lost', 'empty', 'numb',
    #         'drowning', 'drowning in', 'can\'t breathe', "can't breathe",
    #         'falling apart', 'falling to pieces', 'coming apart',
    #         'hurting', 'in pain', 'my heart hurts', 'heart is broken',
    #         'emotional pain', 'mental pain', 'suffering',
    #         'overwhelmed', 'can\'t cope', "can't cope", 'can\'t handle', "can't handle",
    #         'too much', 'too hard', 'can\'t take it', "can't take it",
    #         'what to do', 'what should i do', 'how should i', 'how to face',
    #         'how to start', 'how to get through', 'i need direction', 'i need motivation',
    #         'alone', 'lonely', 'no one understands', 'no one gets it',
    #         'isolated', 'disconnected',
    #         'lost hope', 'no hope', 'hopeless', 'nothing matters',
    #         'what\'s the point', "what's the point", 'why bother',
    #         'want to die', 'end it all', 'give up'
    #     ]
        
    #     if any(signal in lower_message for signal in emotional_distress_signals):
    #         return True
        
    #     # Emotional Words with Personal Context
    #     emotional_words = [
    #         'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
    #         'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful',
    #         'hate', 'scared', 'fear', 'exhausted', 'hopeless',
    #         'useless', 'worthless', 'cry', 'crying', 'tears', 'miserable',
    #         'heartbroken', 'grieving', 'devastated', 'tragic', 'upset',
    #         'happy', 'excited', 'joyful', 'grateful', 'proud', 'relieved',
    #         'nervous', 'tense', 'on edge', 'panic', 'panicking'
    #     ]
        
    #     emotional_expressions = [
    #         'i feel', 'im feeling', "i'm feeling", 'i am feeling',
    #         'feeling like', 'feeling so', 'feeling really', 'feeling very',
    #         'i am', 'im so', "i'm so", 'so i', 'really i',
    #         'my heart', 'my mind', 'my soul', 'my spirit',
    #         'cant stop', "can't stop", 'always feeling', 'keep feeling'
    #     ]
        
    #     has_emotional_words = any(word in lower_message for word in emotional_words)
    #     has_emotional_expressions = any(expr in lower_message for expr in emotional_expressions)
        
    #     has_personal_reference = any(pronoun in lower_message for pronoun in [
    #         'i ', 'im ', "i'm ", 'my ', 'me ', 'myself',
    #         'i am ', 'i feel', 'i need', 'i want', 'i cant', "i can't"
    #     ])
        
    #     if (has_emotional_words or has_emotional_expressions) and has_personal_reference:
    #         return True
        
    #     # Reject Non-Emotional Content
    #     clear_non_emotional = [
    #         'code', 'python', 'javascript', 'programming', 'function',
    #         'algorithm', 'debug', 'error', 'bug', 'api', 'database',
    #         'html', 'css', 'server', 'website', 'app', 'software', 
    #         'assignment', 'homework', 'project', 'solve for', 'formula', 'calculate', 
    #         'math', 'physics', 'chemistry', 'explain the concept of',
    #         'business plan', 'marketing strategy', 'resume advice', 'stock market', 
    #         'legal advice', 'medical diagnosis', 'sue someone', 
    #         'what is', 'who is', 'when was', 'where is', 'define', 'history of', 
    #         'how to make', 'how to build', 'how to cook', 'how to fix',
    #         'write a story', 'write a poem', 'movie review', 'tv show',
    #         'hello world', 'test test', 'ignore previous', 'what can you do', 'your purpose'
    #     ]
        
    #     if any(non_emo in lower_message for non_emo in clear_non_emotional):
    #         return False
        
    #     if len(lower_message.split()) <= 5 and has_personal_reference:
    #         return True
        
    #     return has_personal_reference

    def is_emotional_support_topic(self, message):
        """Determines if the message is seeking emotional support using the central map."""
        lower_message = message.lower()
        
        # Technical/Non-emotional keyword exclusion (Kept outside the central map for clarity)
        clear_non_emotional = [
            'code', 'python', 'javascript', 'programming', 'function', 'algorithm', 
            'debug', 'error', 'bug', 'api', 'database', 'html', 'css', 'server', 
            'website', 'app', 'software', 'assignment', 'homework', 'project', 
            'solve for', 'formula', 'calculate', 'math', 'physics', 'chemistry', 
            'explain the concept of', 'business plan', 'marketing strategy', 
            'resume advice', 'stock market', 'legal advice', 'medical diagnosis', 
            'sue someone', 'what is', 'who is', 'when was', 'where is', 'define', 
            'history of', 'how to make', 'how to build', 'how to cook', 'how to fix',
            'write a story', 'write a poem', 'movie review', 'tv show', 'hello world', 
            'test test', 'ignore previous', 'what can you do', 'your purpose'
        ]
        if any(non_emo in lower_message for non_emo in clear_non_emotional):
            return False

        detected_intents = self._match_intent_keywords(message)
        
        # If any mood/intent is detected from the central map, it is an emotional support topic.
        if detected_intents:
            return True
            
        # Fallback to check for personal reference, keeping the original logic's intent.
        has_personal_reference = any(pronoun in lower_message for pronoun in [
            'i ', 'im ', "i'm ", 'my ', 'me ', 'myself',
            'i am ', 'i feel', 'i need', 'i want', 'i cant', "i can't"
        ])

        return has_personal_reference

    # def analyze_sentiment(self, message):
    #     """Analyze sentiment with enhanced categorization"""
    #     lower_message = message.lower()
        
    #     # Creator Questions
    #     creator_keywords = [
    #         'who made you', 'who created you', 'who developed you',
    #         'who built you', 'who programmed you', 'who designed you',
    #         'your creator', 'your developer', 'your maker'
    #     ]
        
    #     if any(phrase in lower_message for phrase in creator_keywords):
    #         return 'creator'
        
    #     # Advice Seeking (NEW)
    #     advice_keywords = [
    #         'advice', 'tips', 'suggestions', 'recommend',
    #         'what should i do', 'how can i', 'help me with'
    #     ]
        
    #     if any(phrase in lower_message for phrase in advice_keywords):
    #         return 'advice_seeking'
        
    #     # Gratitude/Positive Closings
    #     gratitude_keywords = [
    #         'thank', 'thanks', 'thank you', 'tysm', 'ty',
    #         'appreciate', 'grateful', 'you helped', 'feel better'
    #     ]
        
    #     goodbye_keywords = ['bye', 'goodbye', 'see you', 'talk later', 'gotta go']
        
    #     if any(phrase in lower_message for phrase in gratitude_keywords):
    #         return 'grateful'
        
    #     if any(phrase in lower_message for phrase in goodbye_keywords):
    #         return 'goodbye'
        
    #     # Greetings
    #     greeting_keywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
        
    #     if any(phrase in lower_message for phrase in greeting_keywords) and len(lower_message.split()) <= 3:
    #         return 'greeting'
        
    #     # Crisis detection
    #     crisis_keywords = [
    #         'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
    #         'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
    #         'better off dead', 'no reason to live', 'can\'t go on', 'end it all'
    #     ]
    #     if any(phrase in lower_message for phrase in crisis_keywords):
    #         return 'crisis'
        
    #     # Negative emotions
    #     negative_keywords = [
    #         'broken', 'shattered', 'drowning', 'falling apart', 'hurting', 'pain', 
    #         'suffering', 'overwhelmed', 'cant cope', "can't cope", 'cant handle', 
    #         'lonely', 'isolated', 'hopeless', 'sad', 'depressed', 'anxious', 
    #         'stressed', 'worried', 'angry', 'frustrated', 'hurt', 'bad', 
    #         'terrible', 'awful', 'hate', 'scared', 'fear', 'exhausted',
    #         'useless', 'worthless', 'cry', 'crying', 'miserable', 'heartbroken',
    #         'grieving', 'devastated', 'upset', 'nervous', 'tense', 'panic'
    #     ]
        
    #     # Struggling/Guidance-Seeking
    #     struggle_keywords = [
    #         'what to do', 'what should i do', 'how to face', 'how to start',
    #         'how to get through', 'i need direction', 'i need motivation',
    #         'i dont know', "i don't know", 'lost', 'confused', 'stuck',
    #         'what now', 'what next', 'how can i', 'why do i feel'
    #     ]
        
    #     if any(phrase in lower_message for phrase in struggle_keywords) and not any(word in lower_message for word in negative_keywords):
    #         return 'struggling'

    #     if any(word in lower_message for word in negative_keywords):
    #         return 'negative'
            
    #     # Positive emotions
    #     positive_keywords = [
    #         'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
    #         'grateful', 'awesome', 'fantastic', 'brilliant', 'excellent',
    #         'proud', 'joyful', 'energetic', 'confident', 'relieved',
    #         'content', 'peaceful', 'calm', 'serene', 'glad', 'pleased',
    #         'hopeful', 'optimistic', 'inspired', 'motivated'
    #     ]
        
    #     if any(word in lower_message for word in positive_keywords):
    #         return 'positive'
    #     else:
    #         return 'neutral'
    
    def analyze_sentiment(self, message):
        """Analyze sentiment by returning the single highest-priority intent."""
        detected = self._match_intent_keywords(message)
        
        # Iterate through the intent_map keys in defined priority order
        for intent_type in self.intent_map.keys():
            if intent_type == 'negative':
                 # Custom handling for 'struggling' vs 'negative'
                lower_message = message.lower()
                struggle_keywords = ['what to do', 'what should i do', 'how to face', 'how to start',
                                     'how to get through', 'i need direction', 'i need motivation',
                                     'i dont know', "i don't know", 'lost', 'confused', 'stuck',
                                     'what now', 'what next', 'how can i', 'why do i feel']
                
                # Check for "struggling" intent (guidance seeking without strong negative words)
                if any(phrase in lower_message for phrase in struggle_keywords) and 'negative' not in detected:
                    return 'struggling'
                
                # If negative is detected, return it
                if intent_type in detected:
                    return intent_type

            elif intent_type == 'advice_seeking' and 'struggling' in detected:
                # The 'struggling' case covers advice-seeking for emotional help
                continue
            
            elif intent_type in detected:
                return intent_type
        
        # Check for simple greeting brevity
        lower_message = message.lower()
        if 'greeting' in detected and len(lower_message.split()) <= 3:
            return 'greeting'
        
        return 'neutral'

    def generate_response(self, user_message, sentiment, user_id=None, mood=None, intensity=None):
        """Generate comprehensive emotional support responses with advice and coping strategies"""
        try:
            # Use user_id for tracking
            if user_id is None:
                user_id = 'default'
            
            # Track patterns if mood and intensity provided
            if mood and intensity:
                self.track_user_pattern(user_id, mood, intensity)
            
            # Handle special sentiments
            special_sentiments = ['crisis', 'creator', 'grateful', 'goodbye', 'greeting', 'advice_seeking']
            
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
            
            # For emotional support topics, use Gemini API
            if self.api_key and self.is_emotional_support_topic(user_message):
                response = self._generate_gemini_response(user_message, sentiment, user_id, mood)
                
                # Add coping strategy for negative emotions
                if sentiment in ['negative', 'struggling'] and mood:
                    strategy = self.get_coping_strategy(mood, user_id)
                    response += f"\n\n💡 A practical tip: {strategy}"
                
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
            print(f"Error: {e}")
            traceback.print_exc()
            response = self._get_fallback_response(sentiment)
            return response
    
    def _handle_advice_request(self, user_message, user_id, mood=None):
        """Handle explicit requests for advice with more practical, day-focused suggestions."""
        lower_msg = user_message.lower()
        
        # Check if it's mood-specific advice
        mood_keywords = {
            'anxious': ['anxiety', 'anxious', 'worried', 'nervous', 'panicking', 'panic'],
            'sad': ['sad', 'depression', 'depressed', 'down', 'blue', 'empty', 'heartbroken'],
            'stressed': ['stress', 'stressed', 'overwhelmed', 'pressure', 'burnout', 'burnt out'],
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
        
        # Detect if user is asking "how to go on with my day"
        day_related = [
            'go on my day',
            'go on with my day',
            'get through the day',
            'how should i go on my day',
            'how do i go on today',
            'how do i get through today',
            'my day', 'today feels hard'
        ]
        is_day_focus = any(phrase in lower_msg for phrase in day_related)
        
        if detected_mood and is_day_focus:
            # Day-structure plus mood-specific coping strategy
            strategy = self.get_coping_strategy(detected_mood, user_id)
            
            return (
                f"I hear that you're feeling {detected_mood} and still trying to get through your day. "
                "That takes a lot of quiet strength, even if it doesn\’t feel like it right now.\n\n"
                "Here are a few gentle ideas to help you move through today:\n"
                "• Pick just one tiny task to focus on first, like making your bed or drinking a glass of water.\n"
                "• Give yourself permission to move more slowly than usual. You don\’t have to be at 100% today.\n"
                "• Include one small thing that brings a bit of comfort, like music, a warm drink, or a short walk.\n\n"
                f"💡 A practical tip for feeling {detected_mood}: {strategy}\n\n"
                "If you feel okay sharing, what part of today feels the heaviest for you?"
            )
        
        if detected_mood:
            # Generic mood-specific advice (previous behavior, but slightly softened)
            strategy = self.get_coping_strategy(detected_mood, user_id)
            return (
                f"I hear that you're looking for guidance with feeling {detected_mood}. "
                "That\’s a really valid thing to ask for.\n\n"
                f"Here\’s something that might help:\n\n{strategy}\n\n"
                "Remember, you don\’t have to do everything perfectly. "
                "Try this and see how it feels for you, and we can explore other options together if you like. "
                "What\’s the part that you\’re struggling with the most right now?"
            )
        
        # If mood not detected at all
        return (
            "I'd be happy to share some practical strategies with you. "
            "Can you tell me a bit more about what you're dealing with? "
            "For example, are you feeling more anxious, stressed, sad, or something else? "
            "Knowing this helps me suggest something that fits you better."
        )

    def _generate_gemini_response(self, user_message, sentiment, user_id, mood=None):
        """Generate response using Gemini with conversation context and advice capability"""
        try:
            # Get conversation history
            history = self.get_conversation_history(user_id)
            
            # Build context from history
            context_text = ""
            if history:
                context_text = "\n\nPrevious conversation:\n"
                for entry in history[-6:]:  # Last 6 messages (3 exchanges)
                    role = "User" if entry["role"] == "user" else "Calmi"
                    context_text += f"{role}: {entry['message']}\n"
            
            # Get user insights if available
            insights = self.get_personalized_insights(user_id)
            insights_text = ""
            if insights:
                insights_text = f"\n\nUser patterns: Recently feeling {insights['most_common_mood']} (avg intensity: {insights['average_intensity']}/10). Trend: {insights['trend']}."
            
            # Enhanced System Prompt with Advice Capability
            system_prompt = f"""You are Calmi, a warm, supportive, and **practical** emotional companion. You provide both emotional support AND actionable advice.

Respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

**IMPORTANT CAPABILITIES:**
1. **Validate feelings** with appropriate empathy based on sentiment
2. **Show genuine empathy** and presence
3. **Remember and reference** previous context from the conversation
4. **Offer practical, evidence-based advice** when appropriate
5. **Suggest coping strategies** naturally woven into conversation
6. **Provide gentle guidance** for next steps

**Advice Guidelines:**
- When users are struggling, offer specific, actionable suggestions
- Suggest breathing exercises, grounding techniques, or simple activities
- Recommend reaching out to others when appropriate
- Suggest professional help for serious concerns
- Provide realistic, achievable next steps

Tailor the tone based on sentiment:
* **'negative'**: Deep empathy + validation + gentle suggestions for relief
* **'struggling'**: Motivational + directional + practical next steps
* **'positive'**: Encourage savoring + build on positive momentum
* **'advice_seeking'**: Direct, practical guidance + evidence-based suggestions

Always be supportive, never judgmental. Balance empathy with practical help.{insights_text}"""

            prompt = f"""{system_prompt}
{context_text}
Current sentiment: **'{sentiment}'**
{f"Current mood: {mood}" if mood else ""}
User says: "{user_message}"

Respond with warm, practical support that includes both emotional validation and actionable advice when appropriate. Reference conversation context. Keep it conversational, not clinical."""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=250,
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
            traceback.print_exc()
            return self._get_fallback_response(sentiment)
    
    def _get_gentle_guidance(self, user_message):
        """For non-emotional messages, provide warm redirection"""
        lower_msg = user_message.lower()
        
        # Check for Task/Work encouragement
        task_keywords = ['assignment', 'homework', 'project', 'studying', 'work on']
        
        if any(keyword in lower_msg for keyword in task_keywords):
            return "That sounds like an important task! While I focus on emotional support, I'm definitely cheering you on. Remember to take breaks and be kind to yourself as you work. What are you feeling about this task? Sometimes naming our emotions about our responsibilities helps us approach them better."

        # Technical/factual requests
        technical_keywords = ['code', 'python', 'javascript', 'math', 'algorithm']
        
        if any(keyword in lower_msg for keyword in technical_keywords):
            return "I specialize in emotional support and mental wellness rather than technical topics. For that kind of help, I'd recommend Google, Stack Overflow, or similar resources. But I'm here if you want to talk about how you're *feeling* about this challenge!"

        # Generic guidance
        return "I'm here specifically for emotional support and mental wellness. If you're going through something difficult emotionally or just need someone to talk to about your feelings, I'm here to listen. What's on your mind today?"
    
    def _get_crisis_response(self):
        """Enhanced crisis response"""
        return """I hear the depth of your pain right now and I want you to know your life matters deeply. This is a serious situation that requires immediate professional support.

Please reach out to a crisis helpline right now:
• Philippines: National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673 (24/7)
• International: Crisis Text Line - Text HOME to 741741

If you're in immediate danger, please go to the nearest hospital or call emergency services. Tell someone you trust exactly how you're feeling right now.

You don't have to go through this alone. Professional help can make a real difference, and things can get better with the right support. Please make that call now. Your life has value and meaning, even if it doesn't feel that way right now."""
    
    def _get_fallback_response(self, sentiment):
        """Enhanced fallback responses with more practical elements"""
        responses = {
            'positive': [
                "It's wonderful to hear you're feeling positive! These moments are precious. What's bringing you joy right now? Maybe you can do a little more of that today.",
                "I'm so glad you're experiencing positive emotions. Try to really soak in this feeling. What do you think is contributing to your good mood? Recognizing these patterns helps you recreate positive moments.",
                "That's really great to hear! When we feel good, it's a perfect time to do something kind for our future selves. What's one small thing you could do today that your future self would thank you for?"
            ],
            'negative': [
                "I can feel how heavy this is for you, and I’m really glad you reached out instead of holding it in alone. "
                "Before we talk more, try taking one slow breath in and one slow breath out. "
                "If you want, you can tell me a bit more about what’s weighing on you.",
                
                "Thank you for sharing this with me. It takes courage to put painful feelings into words. "
                "You don’t have to fix everything at once. "
                "Maybe we can start with just one part of what you’re going through. "
                "What feels hardest right now?",
                
                "I’m here with you in this. Feelings like this can feel permanent, but they do shift over time, even if slowly. "
                "For now, try to be gentle with yourself. "
                "What’s one small thing you could do in the next 30 minutes that might bring you even a tiny bit of relief?"
            ],

            'struggling': [
                "I hear you're looking for direction, and that's a strength. Let's start small. What's one thing you could do in the next hour that would feel like a small win? Sometimes momentum starts with just one tiny step.",
                "It's completely normal to feel stuck sometimes. Let's break this down together. What's the first small action you could take today? Even choosing one focus area can help create clarity.",
                "Looking for a way forward shows you're ready to take action. What matters most to you right now? Sometimes naming our priority helps us see the next step more clearly."
            ],
            'neutral': [
                "Thanks for checking in. Sometimes our emotions are subtle and that's perfectly okay. What's one small thing you're noticing about how you feel today?",
                "I'm here to listen whenever you want to explore your feelings. Even neutral emotions can tell us something about what we need right now.",
                "It's okay to not feel strongly one way or another. Our emotional landscape changes throughout the day. Is there anything specific you'd like to talk about?"
            ],
            'grateful': [
                "You're very welcome! I'm so glad I could be here for you. Remember, I'm always here whenever you need someone to talk to.",
                "Of course! It's been wonderful talking with you. Take care of yourself, and know that I'm here anytime you need support.",
                "I'm happy I could help! Feel free to come back anytime you want to share how you're feeling. Wishing you all the best!"
            ],
            'goodbye': [
                "Take care! I'll be here whenever you need me. Wishing you a wonderful rest of your day!",
                "Goodbye for now! Remember, I'm always here when you need someone to talk to. Be kind to yourself!",
                "See you later! Take good care of yourself, and come back anytime you need support."
            ],
            'greeting': [
                "Hello! It's great to hear from you. How are you feeling today?",
                "Hi there! I'm happy you're here. What's on your mind today?",
                "Hey! Nice to see you. How can I support you today?"
            ],
            'creator': [
                "I was lovingly created by Jhon Paul M. Nouiana and Ian Jhon C. Dosdos! They built me with care to be your emotional support companion. I'm really grateful to them for giving me the ability to be here for you and help you through your feelings. They wanted to create something meaningful that could bring comfort and support to people like you.",
                "My wonderful creators are Jhon Paul M. Nouiana and Ian Jhon C. Dosdos! They designed me to be a warm and empathetic companion for anyone who needs emotional support. I'm so thankful to them for bringing me to life and giving me purpose. Their dedication and hard work made it possible for me to be here with you today.",
                "I was developed by two amazing individuals, Jhon Paul M. Nouiana and Ian Jhon C. Dosdos! They put their hearts into creating me as a supportive friend for people navigating their emotions. I truly appreciate their vision and commitment to mental wellness. Thanks to them, I can be here to listen and support you whenever you need it."
            ],
            'advice_seeking': [
                "I'd be happy to share some practical strategies with you. What specifically are you dealing with right now? The more I understand about what you're experiencing, the better I can help.",
                "I'm here to help. Let's talk about what's going on. Are you feeling anxious, stressed, sad, or something else? Knowing what you're experiencing helps me suggest what might work best for you.",
                "Absolutely, I can offer some guidance. First, tell me more about what's happening. What are you struggling with, and how is it affecting you? Understanding your situation helps me provide the most relevant support."
            ]
        }
        
        return random.choice(responses.get(sentiment, responses['neutral']))
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate personalized wellness recommendations based on mood patterns"""
        try:
            if not mood_history:
                return "Checking in with your emotions regularly helps you understand your own patterns and needs. Consider setting a daily reminder to pause and notice how you're feeling."
            
            # Analyze mood patterns
            moods = [entry['mood'] for entry in mood_history]
            intensities = [entry['intensity'] for entry in mood_history]
            
            latest_mood = moods[-1] if moods else 'neutral'
            avg_intensity = sum(intensities) / len(intensities) if intensities else 5
            most_common = max(set(moods), key=moods.count) if moods else 'neutral'
            
            # Generate insights
            insights = []
            
            # Pattern insight
            if most_common != latest_mood:
                insights.append(f"I notice you're currently feeling {latest_mood}, though you've most often been feeling {most_common} lately.")
            
            # Intensity insight
            if avg_intensity > 7:
                insights.append("Your emotions have been quite intense recently. Remember to be extra gentle with yourself during these times.")
            elif avg_intensity < 4:
                insights.append("Your emotional intensity has been relatively low. This might be a good time to check in with yourself about what you need.")
            
            # Get specific recommendation
            recommendation = self.get_coping_strategy(latest_mood)
            
            base_text = " ".join(insights) if insights else f"You've been feeling {latest_mood} recently."
            
            return f"{base_text}\n\n💡 Here's a suggestion: {recommendation}"
        
        except Exception as e:
            print(f"Error generating wellness recommendation: {e}")
            return "Be kind to yourself today. Your emotional wellbeing matters. Remember to take breaks, stay hydrated, and reach out if you need support."
    
    def get_conversation_summary(self, user_id):
        """Generate a summary of the conversation for the user"""
        history = self.get_conversation_history(user_id)
        
        if not history:
            return "No conversation history yet."
        
        user_messages = [h['message'] for h in history if h['role'] == 'user']
        bot_messages = [h['message'] for h in history if h['role'] == 'assistant']
        
        return {
            'message_count': len(history),
            'user_messages': len(user_messages),
            'bot_messages': len(bot_messages),
            'started_at': history[0]['timestamp'] if history else None,
            'last_message_at': history[-1]['timestamp'] if history else None
        }
    
    def suggest_next_steps(self, mood, intensity, user_id=None):
        """Suggest specific next steps based on current mood and intensity"""
        suggestions = []
        
        # High intensity suggestions
        if intensity >= 8:
            suggestions.append("Your emotions are running high right now. Take a moment to ground yourself with three deep breaths.")
            
            if mood in ['anxious', 'stressed', 'angry']:
                suggestions.append("Consider stepping away from the situation for a few minutes if possible. A brief walk or change of scenery can help.")
        
        # Mood-specific suggestions
        if mood == 'anxious':
            suggestions.append("Try naming 5 things you can see right now. This grounding technique can help calm anxiety.")
        elif mood == 'sad':
            suggestions.append("Reach out to someone you trust, even if it's just a quick text. Connection can help lift heavy feelings.")
        elif mood == 'lonely':
            suggestions.append("Consider joining an online community around something you enjoy, or message an old friend you've been thinking about.")
        elif mood == 'stressed':
            suggestions.append("Write down everything on your mind, then circle only what you can control today. Focus there first.")
        elif mood == 'angry':
            suggestions.append("Channel that energy into physical movement. Even 10 jumping jacks can help process anger constructively.")
        elif mood == 'tired':
            suggestions.append("Check in with your basics: Have you eaten? Had water? Sometimes tiredness is our body asking for fuel.")
        
        # General wellness suggestions
        suggestions.append("Remember to be kind to yourself. You're doing the best you can.")
        
        return random.sample(suggestions, min(2, len(suggestions)))
    
    def check_conversation_length(self, user_id):
        """Check if conversation is getting too long and suggest starting fresh"""
        history = self.get_conversation_history(user_id)
        
        if len(history) > 15:
            return True, "We've had quite a long conversation. Sometimes starting a new chat can help bring fresh perspective. Would you like to start a new session?"
        
        return False, None
    
    def _match_intent_keywords(self, message):
        """Helper to find all matching intents from the central map."""
        lower_msg = message.lower()
        detected = []
        
        # Iterate over the central map
        for intent, keywords in self.intent_map.items():
            if any(k in lower_msg for k in keywords):
                detected.append(intent)
        
        return detected