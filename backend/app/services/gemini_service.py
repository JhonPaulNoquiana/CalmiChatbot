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
        # NEW: Store conversation history per user
        self.conversation_histories = {}
    
    def get_conversation_history(self, user_id):
        """Get conversation history for a specific user"""
        if user_id not in self.conversation_histories:
            self.conversation_histories[user_id] = []
        return self.conversation_histories[user_id]
    
    def add_to_history(self, user_id, role, message):
        """Add a message to conversation history"""
        history = self.get_conversation_history(user_id)
        history.append({"role": role, "message": message})
        # Keep only last 10 exchanges (20 messages) to avoid token limits
        if len(history) > 20:
            self.conversation_histories[user_id] = history[-20:]
    
    def clear_history(self, user_id):
        """Clear conversation history for a user"""
        if user_id in self.conversation_histories:
            self.conversation_histories[user_id] = []
    
    def is_emotional_support_topic(self, message):
        """Determines if the message is seeking emotional support, including general guidance/overwhelm."""
        lower_message = message.lower().strip()
        
        # --- Creator Questions (About the developers) ---
        creator_questions = [
            'who made you', 'who created you', 'who developed you',
            'who built you', 'who programmed you', 'who designed you',
            'your creator', 'your developer', 'your maker',
            'who are your creators', 'who are your developers',
            'made by', 'created by', 'developed by'
        ]
        
        if any(phrase in lower_message for phrase in creator_questions):
            return True
        
        # --- Gratitude & Casual Conversation (Part of emotional support) ---
        gratitude_casual = [
            'thank', 'thanks', 'thank you', 'tysm', 'ty',
            'appreciate', 'grateful', 'you helped', 'you\'re helpful',
            'that helps', 'that helped', 'feel better',
            'bye', 'goodbye', 'see you', 'talk later', 'gotta go',
            'hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening'
        ]
        
        if any(phrase in lower_message for phrase in gratitude_casual):
            return True
        
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
            
            # Crisis indicators
            'want to die', 'end it all', 'give up'
        ]
        
        if any(signal in lower_message for signal in emotional_distress_signals):
            return True
        
        # --- Emotional Words with Personal Context ---
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
        
        # --- Reject Non-Emotional Content ---
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
        
        # --- Creator Questions ---
        creator_keywords = [
            'who made you', 'who created you', 'who developed you',
            'who built you', 'who programmed you', 'who designed you',
            'your creator', 'your developer', 'your maker',
            'who are your creators', 'who are your developers',
            'made by', 'created by', 'developed by'
        ]
        
        if any(phrase in lower_message for phrase in creator_keywords):
            return 'creator'
        
        # --- Gratitude/Positive Closings ---
        gratitude_keywords = [
            'thank', 'thanks', 'thank you', 'tysm', 'ty',
            'appreciate', 'grateful', 'you helped', 'feel better'
        ]
        
        goodbye_keywords = ['bye', 'goodbye', 'see you', 'talk later', 'gotta go']
        
        if any(phrase in lower_message for phrase in gratitude_keywords):
            return 'grateful'
        
        if any(phrase in lower_message for phrase in goodbye_keywords):
            return 'goodbye'
        
        # --- Greetings ---
        greeting_keywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening']
        
        if any(phrase in lower_message for phrase in greeting_keywords) and len(lower_message.split()) <= 3:
            return 'greeting'
        
        # --- Crisis detection ---
        crisis_keywords = [
            'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
            'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
            'better off dead', 'no reason to live', 'can\'t go on', 'end it all',
            'overdose', 'jump off', 'hurt someone', 'kill someone', 'attack someone',
            'ending things', 'ending it all'
        ]
        if any(phrase in lower_message for phrase in crisis_keywords):
            return 'crisis'
        
        # --- Negative emotions ---
        negative_keywords = [
            'broken', 'shattered', 'drowning', 'falling apart', 'hurting', 'pain', 
            'suffering', 'overwhelmed', 'cant cope', "can't cope", 'cant handle', 
            'lonely', 'isolated', 'hopeless', 'sad', 'depressed', 'anxious', 
            'stressed', 'worried', 'angry', 'frustrated', 'hurt', 'bad', 
            'terrible', 'awful', 'hate', 'scared', 'fear', 'exhausted',
            'useless', 'worthless', 'cry', 'crying', 'miserable', 'heartbroken',
            'grieving', 'devastated', 'upset', 'nervous', 'tense', 'panic'
        ]
        
        # --- Struggling/Guidance-Seeking ---
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
            
        # --- Positive emotions ---
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
    
    def generate_response(self, user_message, sentiment, user_id=None, conversation_context=None):
        """Generate natural emotional support responses with conversation memory"""
        try:
            # Use user_id for tracking (default to 'default' if not provided)
            if user_id is None:
                user_id = 'default'
            
            # Handle special sentiments with predefined responses (skip Gemini API)
            special_sentiments = ['crisis', 'creator', 'grateful', 'goodbye', 'greeting']
            
            if sentiment in special_sentiments:
                if sentiment == 'crisis':
                    response = self._get_crisis_response()
                else:
                    response = self._get_fallback_response(sentiment)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            
            # For emotional support topics, use Gemini API
            if self.api_key and self.is_emotional_support_topic(user_message):
                response = self._generate_gemini_response(user_message, sentiment, user_id)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            else:
                if not self.is_emotional_support_topic(user_message):
                    response = self._get_gentle_guidance(user_message)
                    self.add_to_history(user_id, "user", user_message)
                    self.add_to_history(user_id, "assistant", response)
                    return response
                response = self._get_fallback_response(sentiment)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
        
        except Exception as e:
            print(f"Error: {e}")
            response = self._get_fallback_response(sentiment)
            return response
    
    def _generate_gemini_response(self, user_message, sentiment, user_id):
        """Generate response using Gemini with conversation context"""
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
            
            # --- System Prompt with Memory ---
            system_prompt = """You are Calmi, a warm, supportive, and **grounded** emotional companion. You only provide emotional support.

Respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

**IMPORTANT: Pay close attention to the conversation history. When the user refers to people, situations, or topics from previous messages, acknowledge and reference them directly. Maintain continuity and show you remember what they've shared.**

Focus on:
1. **Validating their feelings** (using appropriate intensity based on sentiment).
2. **Showing genuine empathy** and presence.
3. **Remembering and referencing previous context** from the conversation.
4. **Offering gentle, actionable next steps** or self-compassion.

Tailor the tone based on the user's sentiment:
* **'negative'**: Use **deep empathy**, validation of pain, and gentle acceptance. Reference any previous context they shared (like family issues, relationships, etc.).
* **'struggling'**: Use a **motivational, directional, and high-agency tone**. Acknowledge they are seeking a **starting point or positive perspective**. Focus on small, manageable actions, building positive habits, or choosing a focus for the hour/day. **Do not use overly dramatic language, apologize, or assume the user is sad/overwhelmed if they ask for direction.** Keep the tone light, encouraging, and respectful of their ability to cope.
* **'positive'**: Acknowledge and encourage savoring the good mood.

No advice about non-emotional topics. Always be a friend, never a therapist."""

            prompt = f"""{system_prompt}
{context_text}
The user's current sentiment is **'{sentiment}'**.
They say: "{user_message}"

Respond with natural, flowing sentences that show appropriate empathy, reference previous conversation context when relevant, and offer real, grounded emotional support. No colons, no lists, just warm, compassionate conversation."""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=200,  # Increased for more contextual responses
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
            cheer_responses = [
                "That sounds like a big task! While I can't help you with the assignment itself, I can absolutely cheer you on. Remember to take breaks and be kind to yourself as you work. You've got this!",
                "I hear you're diving into some work. That takes focus! I'm here for emotional support, but I'm sending you all the motivation and good energy for your task. What's the first small step you're going to tackle?",
                "That's outside my mental wellness focus, but I admire your dedication to getting it done! Take a deep breath, break it down, and know that I'm rooting for you to succeed in your project!",
                "Great work starting that project! I can't write code or solve equations, but I can remind you to stay hydrated and step away every 45 minutes. Go get those tasks done!"
            ]
            return random.choice(cheer_responses)

        # --- 2. Check for purely factual/technical requests (WARM REDIRECTION) ---
        technical_factual_keywords = ['code', 'python', 'javascript', 'math', 'algorithm', 'function', 'formula', 'api', 'explain the concept of', 'solve for', 'define', 'history of', 'science', 'physics', 'chemistry', 'business plan', 'legal advice', 'medical diagnosis', 'how to cook', 'how to make']
        
        if any(keyword in lower_msg for keyword in technical_factual_keywords):
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
                "Thank you for reaching out even when you're feeling uncertain. I want you to know that your feelings are completely valid. It's okay to not have all the answers right now.",
                "I'm here with you in this moment. When we feel uncertain, it can be hard to know what step to take next. Sometimes just naming the feeling is a powerful first step."
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
        """Crisis response in flowing sentences"""
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
            return "Be kind to yourself today. Your emotional wellbeing matters."