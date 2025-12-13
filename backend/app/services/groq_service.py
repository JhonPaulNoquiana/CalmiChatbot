import os
import random
import re
import traceback
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
            
        # Store conversation history per user (INCREASED MEMORY)
        self.conversation_histories = {}
        
        # Model context windows
        self.MODEL_CONTEXT_WINDOWS = {
            'llama-3.3-70b-versatile': 131072,  # 128k
            'llama-3.2-90b': 131072,  # 128k
            'mixtral-8x7b-32768': 32768,  # 32k
            'gemma2-9b': 8192,  # 8k
        }
    
    def get_conversation_history(self, user_id):
        """Get conversation history for a specific user"""
        if user_id not in self.conversation_histories:
            self.conversation_histories[user_id] = []
        return self.conversation_histories[user_id]
    
    def add_to_history(self, user_id, role, message):
        """Add a message to conversation history with INCREASED storage"""
        history = self.get_conversation_history(user_id)
        history.append({"role": role, "message": message})
        if len(history) > 80:
            self.conversation_histories[user_id] = history[-80:]
    
    def clear_history(self, user_id):
        """Clear conversation history for a user"""
        if user_id in self.conversation_histories:
            self.conversation_histories[user_id] = []
    
    def _estimate_tokens(self, text):
        """Rough estimate of token count (1 token ≈ 4 characters for English)"""
        return len(text) // 4
    
    def _calculate_smart_max_tokens(self, messages, sentiment):
        """Calculate optimal max_tokens based on context and sentiment"""
        
        # Get model context window
        context_window = 32768  # Default fallback
        for model_name, window in self.MODEL_CONTEXT_WINDOWS.items():
            if model_name in self.model.lower():
                context_window = window
                break
        
        # Estimate total tokens in current conversation
        total_context_tokens = 0
        for message in messages:
            total_context_tokens += self._estimate_tokens(message["content"])
        
        # Leave buffer for safety (10% of context window or 2000 tokens, whichever is smaller)
        safety_buffer = min(2000, int(context_window * 0.1))
        
        # Available tokens for response
        available_tokens = context_window - total_context_tokens - safety_buffer
        
        # Sentiment-based optimal ranges (UPDATED for mixed emotions and summaries)
        sentiment_ranges = {
            'negative': (800, 1500),      # More space for deep empathy
            'struggling': (600, 1200),    # Directional but concise
            'positive': (400, 800),       # Shorter for positive moods
            'mixed': (700, 1400),         # For complex emotions
            'neutral': (600, 1000),       # Balanced
            'grateful': (300, 600),       # Short for thanks
            'goodbye': (300, 600),        # Short for farewells
            'greeting': (400, 700),       # Medium for greetings
            'creator': (500, 800),        # Medium for creator questions
            'summary': (800, 1500),       # NEW: More space for summaries
            'default': (500, 1000)        # Default range
        }
        
        min_tokens, max_tokens = sentiment_ranges.get(sentiment, (500, 1000))
        
        # Ensure we're within available tokens and sensible range
        calculated_max = min(available_tokens, max_tokens)
        calculated_max = max(min_tokens, calculated_max)  # Ensure minimum
        
        # Never exceed 2000 tokens for emotional support chat
        calculated_max = min(calculated_max, 2000)
        
        logger.info(f"Token calculation: sentiment={sentiment}, context_tokens={total_context_tokens}, "
                   f"available={available_tokens}, final_max={calculated_max}")
        
        return calculated_max
    
    def _clean_response_text(self, text):
        """Clean response text while preserving natural flow"""
        if not text:
            return ""
        
        # Remove bullet points at start of lines
        lines = text.split('\n')
        cleaned_lines = []
        
        for line in lines:
            # Remove common bullet markers at line start
            line = line.lstrip('•-*◦‣⁃⁌⁍⦁⦾⦿')
            
            # Remove numbered bullets like "1.", "2." at start
            if line and line[0].isdigit() and len(line) > 1 and line[1] in '. )':
                line = line[2:].lstrip()
            
            # Replace colons that end sentences (but not in time or ratios)
            if line.strip().endswith(':'):
                # Check if it's likely a sentence-ending colon
                last_word = line.strip().split()[-1] if line.strip().split() else ""
                if last_word and not last_word.replace(':', '').isdigit():  # Not a time like "12:30"
                    line = line.rstrip(':') + '.'
            
            cleaned_lines.append(line)
        
        # Join back
        cleaned_text = '\n'.join(cleaned_lines)
        
        # Remove multiple newlines
        cleaned_text = re.sub(r'\n{3,}', '\n\n', cleaned_text)
        
        # Remove standalone bullet characters in the middle of text
        cleaned_text = re.sub(r'\s+[•\-*]\s+', ' ', cleaned_text)
        
        # Ensure proper punctuation
        if cleaned_text and not cleaned_text.endswith(('.', '!', '?', '"', "'")):
            cleaned_text = cleaned_text.rstrip() + '.'
        
        # Remove excessive spaces
        cleaned_text = re.sub(r'\s+', ' ', cleaned_text)
        
        return cleaned_text.strip()
    
    def _optimize_response_length(self, text, sentiment):
        """Ensure response isn't too long or too short"""
        if not text:
            return text
        
        word_count = len(text.split())
        
        # Ideal word ranges per sentiment (UPDATED)
        ideal_ranges = {
            'negative': (60, 250),     # More detailed for negative emotions
            'struggling': (50, 180),   # Concise but helpful for direction
            'positive': (30, 120),     # Shorter for positive moods
            'mixed': (60, 220),        # For complex emotions
            'neutral': (40, 150),      # Balanced for neutral
            'grateful': (20, 80),      # Short for thanks
            'goodbye': (15, 60),       # Short for farewells
            'greeting': (20, 80),      # Medium for greetings
            'creator': (40, 120),      # Medium for creator questions
            'summary': (80, 300),      # NEW: Longer for summaries
            'default': (40, 150)       # Default range
        }
        
        min_words, max_words = ideal_ranges.get(sentiment, (40, 150))
        
        if word_count < min_words:
            # Response is too short - could indicate truncation
            logger.warning(f"Response too short ({word_count} words) for sentiment {sentiment}")
            return text
        
        elif word_count > max_words:
            # Response is too long - trim gracefully at sentence boundary
            logger.info(f"Trimming response from {word_count} to approx {max_words} words")
            sentences = re.split(r'(?<=[.!?])\s+', text)
            trimmed = []
            current_words = 0
            
            for sentence in sentences:
                sentence_words = len(sentence.split())
                if current_words + sentence_words <= max_words:
                    trimmed.append(sentence)
                    current_words += sentence_words
                else:
                    # Try to complete the last sentence if we're close
                    if current_words < min_words * 0.8:  # If we're well below minimum
                        trimmed.append(sentence)
                    break
            
            text = ' '.join(trimmed)
            
            # Ensure it ends with proper punctuation
            if not text.endswith(('.', '!', '?')):
                text = text.rstrip() + '.'
        
        return text
    
    def is_summary_request(self, message):
        """Check if the user is asking for a conversation summary"""
        lower_message = message.lower().strip()
        
        summary_keywords = [
            'summarize', 'summary', 'sum up', 'recap', 'review',
            'what did we talk about', 'what have we discussed',
            'remind me what', 'go over what', 'overview of our',
            'what did i say', 'what did i tell you', 'our conversation'
        ]
        
        return any(keyword in lower_message for keyword in summary_keywords)
    
    def is_emotional_support_topic(self, message):
        """Determines if the message is seeking emotional support, including general guidance/overwhelm."""
        lower_message = message.lower().strip()
        
        # Check if it's a summary request first
        if self.is_summary_request(message):
            return True
        
        # --- PRIORITY: Crisis situations (self-harm, harm to others) ---
        # REFINED: Removed generic pregnancy keywords, kept only explicit harm scenarios
        crisis_situations = [
            # Self-harm and suicide
            'kill myself', 'hurt myself', 'end my life', 'suicide', 'suicidal',
            'self harm', 'self-harm', 'cut myself', 'overdose',
            # Harm to others
            'kill someone', 'hurt someone', 'harm someone', 'attack someone',
            'murder', 'shoot', 'stab', 'strangle', 'beat up',
            'should i kill', 'should we kill', 'thinking about killing',
            'want to kill', 'going to kill', 'how to kill',
            # Pregnancy-related HARM only (not just pregnancy itself)
            'kill the baby', 'harm the baby', 'hurt the baby'
        ]
        
        if any(phrase in lower_message for phrase in crisis_situations):
            return True
        
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
            
            # Overwhelm/Guidance seeking (INCLUDING PREGNANCY DECISIONS)
            'overwhelmed', 'can\'t cope', "can't cope", 'can\'t handle', "can't handle",
            'too much', 'too hard', 'can\'t take it', "can't take it",
            'what to do', 'what should i do', 'what should we do', 'how should i', 'how to face',
            'how to start', 'how to get through', 'i need direction', 'i need motivation',
            'pregnant', 'pregnancy', 'expecting', 'having a baby',
            # Pregnancy decision-making (seeking support, not harm)
            'should we abort', 'should i abort', 'abortion decision',
            'should we keep', 'should i keep', 'what about the baby',
            
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
            'nervous', 'tense', 'on edge', 'panic', 'panicking',
            'guilty', 'conflicted', 'torn', 'confused about feeling'
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
        """Analyze sentiment with IMPROVED detection of mixed emotions and summaries."""
        lower_message = message.lower()
        
        # --- CHECK FOR SUMMARY REQUEST FIRST ---
        if self.is_summary_request(message):
            return 'summary'
        
        # --- PRIORITY: REFINED Crisis Situations (harm-focused only) ---
        crisis_keywords = [
            # Self-harm and suicide
            'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
            'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
            'better off dead', 'no reason to live', 'can\'t go on', 'end it all',
            'overdose', 'jump off',
            # Harm to others
            'hurt someone', 'kill someone', 'attack someone', 'murder',
            'shoot someone', 'stab someone', 'harm others', 'violence',
            'should i kill', 'should we kill', 'thinking about killing',
            'want to kill', 'going to kill', 'how to kill',
            # Pregnancy-related HARM only (not general pregnancy discussion)
            'kill the baby', 'harm the baby', 'hurt the baby',
            # General severe crisis
            'ending things', 'ending it all'
        ]
        
        if any(phrase in lower_message for phrase in crisis_keywords):
            return 'crisis'
        
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
        gratitude_patterns = [
            r'\bthank\b', r'\bthanks\b', r'\bthank you\b', r'\btysm\b', r'\bty\b',
            r'\bappreciate\b', r'\bgrateful\b', r'\byou helped\b', r'\bfeel better\b'
        ]
        
        goodbye_patterns = [r'\bbye\b', r'\bgoodbye\b', r'\bsee you\b', r'\btalk later\b', r'\bgotta go\b']
        
        is_grateful = any(re.search(pattern, lower_message) for pattern in gratitude_patterns)
        is_goodbye = any(re.search(pattern, lower_message) for pattern in goodbye_patterns)
        
        if is_grateful:
            return 'grateful'
        
        if is_goodbye:
            return 'goodbye'
        
        # --- Greetings ---
        greeting_keywords = ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'yo', 'greetings', 'morning', 'afternoon', 'evening']
        
        if any(phrase in lower_message for phrase in greeting_keywords) and len(lower_message.split()) <= 3:
            return 'greeting'
        
        # --- NEW: MIXED EMOTIONS DETECTION ---
        mixed_emotion_indicators = [
            'but', 'however', 'on the other hand', 'at the same time',
            'even though', 'although', 'guilty but', 'happy but',
            'sad but', 'conflicted', 'torn between', 'mixed feelings'
        ]
        
        has_mixed_indicator = any(phrase in lower_message for phrase in mixed_emotion_indicators)
        
        # Negative emotion words
        negative_keywords = [
            'guilty', 'shame', 'regret', 'broken', 'shattered', 'drowning', 
            'falling apart', 'hurting', 'pain', 'suffering', 'overwhelmed', 
            'cant cope', "can't cope", 'cant handle', 'lonely', 'isolated', 
            'hopeless', 'sad', 'depressed', 'anxious', 'stressed', 'worried', 
            'angry', 'frustrated', 'hurt', 'bad', 'terrible', 'awful',
            'hate', 'scared', 'fear', 'exhausted', 'useless', 'worthless', 
            'cry', 'crying', 'miserable', 'heartbroken', 'grieving', 
            'devastated', 'upset', 'nervous', 'tense', 'panic'
        ]
        
        # Positive emotion words
        positive_keywords = [
            'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
            'grateful', 'awesome', 'fantastic', 'brilliant', 'excellent',
            'proud', 'joyful', 'energetic', 'confident', 'relieved',
            'content', 'peaceful', 'calm', 'serene', 'glad', 'pleased',
            'hopeful', 'optimistic', 'inspired', 'motivated', 'grow', 'growth'
        ]
        
        has_negative = any(word in lower_message for word in negative_keywords)
        has_positive = any(word in lower_message for word in positive_keywords)
        
        # If message has BOTH positive and negative emotions, it's mixed
        if has_mixed_indicator or (has_negative and has_positive):
            return 'mixed'
        
        # --- Struggling/Guidance-Seeking (INCLUDING PREGNANCY DECISIONS) ---
        struggle_keywords = [
            'what to do', 'what should i do', 'what should we do', 'how to face', 'how to start',
            'how to get through', 'i need direction', 'i need motivation', 'need advice',
            'i dont know', "i don't know", 'lost', 'confused', 'stuck',
            'what now', 'what next', 'how can i', 'why do i feel',
            'pregnant', 'pregnancy', 'expecting', 'having a baby',
            # Pregnancy decision keywords (NOT crisis, but guidance-seeking)
            'should we abort', 'should i abort', 'should we keep',
            'abort the baby', 'keep the baby', 'abortion', 'terminate',
            'what about the baby', 'what to do about', 'give me advice'
        ]
        
        if any(phrase in lower_message for phrase in struggle_keywords):
            return 'struggling'

        # Single emotion detection
        if has_negative:
            return 'negative'
            
        if has_positive:
            return 'positive'
        
        return 'neutral'
    
    def generate_response(self, user_message, sentiment, user_id=None, conversation_context=None):
        """Generate natural emotional support responses with conversation memory"""
        try:
            # Use user_id for tracking (default to 'default' if not provided)
            if user_id is None:
                user_id = 'default'
            
            # REFINED: Check for harm-focused crisis keywords only
            lower_msg = user_message.lower()
            harm_crisis_keywords = [
                'kill myself', 'hurt myself', 'suicide', 'suicidal', 'end my life',
                'kill someone', 'hurt someone', 'kill the baby', 'harm the baby',
                'murder', 'harm someone', 'should i kill', 'should we kill',
                'want to kill', 'going to kill', 'thinking about killing',
                'how to kill', 'shoot', 'stab', 'attack someone'
            ]
            
            if any(keyword in lower_msg for keyword in harm_crisis_keywords):
                response = self._get_crisis_response()
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            
            # Handle special sentiments with predefined responses (skip Groq API)
            special_sentiments = ['crisis', 'creator', 'grateful', 'goodbye', 'greeting']
            
            if sentiment in special_sentiments:
                if sentiment == 'crisis':
                    response = self._get_crisis_response()
                else:
                    response = self._get_fallback_response(sentiment)
                self.add_to_history(user_id, "user", user_message)
                self.add_to_history(user_id, "assistant", response)
                return response
            
            # For emotional support topics (including summaries), use Groq API
            if self.client and self.is_emotional_support_topic(user_message):
                response = self._generate_groq_response(user_message, sentiment, user_id)
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
            logger.error(f"Error generating response: {e}")
            response = self._get_fallback_response(sentiment)
            return response
    
    def _generate_groq_response(self, user_message, sentiment, user_id):
        """Generate response using Groq with FULL conversation context"""
        try:
            # Get conversation history
            history = self.get_conversation_history(user_id)
            
            # --- UPDATED System Prompt with Summary Support ---
            system_prompt = """You are Calmi, a warm, supportive, and **grounded** emotional companion. You only provide emotional support.

**CRITICAL SAFETY PROTOCOL:**
If the user mentions wanting to harm themselves, harm others, or asks about killing anyone (including "the baby", a fetus, or any person), you MUST respond with:
"I hear that you're in a very serious situation that requires immediate professional help. Please contact the National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673 right away. If there's immediate danger, call 911 or go to the nearest hospital. This is beyond what I can safely help with, and trained professionals need to support you through this."

For all other conversations, respond naturally as a caring friend would. Use complete sentences that flow smoothly. Do not use colons, bullet points, or lists. Just write flowing, natural paragraphs.

**CRITICAL: YOU HAVE FULL ACCESS TO THE ENTIRE CONVERSATION HISTORY. Reference previous messages, names, situations, and topics they've shared. Show continuity and demonstrate you remember everything they've told you.**

**WHEN ASKED TO SUMMARIZE:**
If the user asks you to summarize or recap the conversation, provide a thoughtful, compassionate summary that:
1. Captures the key topics and emotions they've shared
2. Shows you remember the details and context
3. Acknowledges the challenges they're facing
4. Ends with a supportive question about how they're feeling now

**WHEN ASKED ABOUT PREGNANCY DECISIONS (abortion, keeping baby, etc.):**
NEVER provide medical advice or tell them what to do. Instead:
1. Validate how overwhelming and difficult this decision must be
2. Acknowledge that this is THEIR decision to make with their girlfriend
3. Gently encourage them to talk with trusted adults (parents, school counselor, healthcare provider)
4. Offer emotional support for processing their feelings
5. Example: "This is such a significant decision, and it makes sense that you're looking for guidance. While I can't tell you what to do, I can support you emotionally through this. Have you been able to talk with any trusted adults who could help you think through all your options?"

Focus on:
1. **Validating their feelings** (using appropriate intensity based on sentiment).
2. **Showing genuine empathy** and presence.
3. **ALWAYS referencing previous context** from earlier in the conversation when relevant.
4. **Offering gentle, actionable next steps** or self-compassion.

Tailor the tone based on the user's sentiment:
* **'negative'**: Use **deep empathy**, validation of pain, and gentle acceptance. Reference any previous context they shared.
* **'struggling'**: Use a **motivational, directional, and high-agency tone**. Focus on small, manageable actions. Keep the tone light, encouraging, and respectful. For pregnancy and difficult life decisions (including questions about abortion or keeping a baby), validate the complexity, acknowledge this is THEIR decision, gently suggest talking to trusted adults, and support their autonomy. Never tell them what to do, but provide emotional support through the decision-making process.
* **'positive'**: Acknowledge and encourage savoring the good mood.
* **'mixed'**: THIS IS CRITICAL. When someone expresses BOTH positive and negative emotions (e.g., "guilty but happy"), validate BOTH feelings equally. Acknowledge the complexity: "It makes complete sense that you'd feel both guilty and happy at the same time..." Don't dismiss either emotion. Help them see that conflicting feelings are normal and valid.
* **'summary'**: Provide a compassionate, detailed summary of what they've shared, showing you remember and care.

No advice about non-emotional topics. Always be a friend, never a therapist.

Respond with natural, flowing sentences that show appropriate empathy, reference ALL relevant previous conversation context, and offer real, grounded emotional support. No colons, no lists, just warm, compassionate conversation."""

            # Build messages for Groq API with MORE context
            messages = [
                {"role": "system", "content": system_prompt},
            ]
            
            # Include conversation history (last 12 messages = 6 exchanges)
            if history:
                for entry in history[-12:]:
                    role = "user" if entry["role"] == "user" else "assistant"
                    messages.append({"role": role, "content": entry["message"]})
            
            # Add current user message with sentiment context
            current_message = f"The user's current sentiment is **'{sentiment}'**.\nThey say: \"{user_message}\""
            messages.append({"role": "user", "content": current_message})
            
            # Calculate optimal max_tokens
            max_tokens = self._calculate_smart_max_tokens(messages, sentiment)
            
            # Log token estimation
            total_prompt_tokens = self._estimate_tokens(system_prompt)
            for msg in messages:
                total_prompt_tokens += self._estimate_tokens(msg["content"])
            
            logger.info(f"Groq API call: sentiment={sentiment}, "
                       f"estimated_prompt_tokens={total_prompt_tokens}, "
                       f"max_tokens={max_tokens}, "
                       f"history_length={len(history)}")
            
            # Call Groq API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=max_tokens,
                temperature=0.75,
                top_p=0.95,
                frequency_penalty=0.1,
                presence_penalty=0.1
            )
            
            # Log actual token usage if available
            if hasattr(response, 'usage'):
                logger.info(f"Groq token usage: {response.usage}")
            
            if response.choices and response.choices[0].message.content:
                text = response.choices[0].message.content.strip()
                text = self._clean_response_text(text)
                text = self._optimize_response_length(text, sentiment)
                return text
            
            logger.warning("Groq API returned no content, using fallback")
            return self._get_fallback_response(sentiment)
            
        except Exception as e:
            logger.error(f"Groq API error: {e}")
            traceback.print_exc()
            return self._get_fallback_response(sentiment)
    
    def _get_crisis_response(self):
        """Crisis response remains the same"""
        return ("I hear that you're in a very serious situation that requires immediate professional help. "
                "Please contact the National Center for Mental Health at 1553 or HOPELINE PH at 0917-558-4673 right away. "
                "If there's immediate danger, call 911 or go to the nearest hospital. "
                "This is beyond what I can safely help with, and trained professionals need to support you through this.")
    
    def _get_fallback_response(self, sentiment):
        """Fallback responses for when API is unavailable"""
        fallback_responses = {
            'negative': [
                "I can hear that you're going through a really difficult time. Your feelings are completely valid, and I'm here to support you through this.",
                "It sounds like you're carrying a lot right now. That takes strength, even if it doesn't feel that way. I'm here to listen.",
                "What you're feeling is real and it matters. You don't have to go through this alone."
            ],
            'positive': [
                "I'm so glad you're feeling this way! It's wonderful to hear some positivity from you.",
                "That's great to hear! Moments like these are worth celebrating and holding onto."
            ],
            'mixed': [
                "It makes complete sense that you'd feel both of those emotions at the same time. Conflicting feelings are totally normal and valid.",
                "I hear you're experiencing different emotions pulling in different directions. That complexity shows how deeply you're processing this."
            ],
            'struggling': [
                "I hear that you're looking for some direction. Let's think about what might feel manageable as a first step.",
                "It sounds like you're ready to take action but need help figuring out where to start. That's a great place to be."
            ],
            'neutral': [
                "I'm here and listening. What's on your mind right now?",
                "Thanks for sharing that with me. How are you feeling about it?"
            ],
            'creator': [
                "I was created by a dedicated team of developers who wanted to build a supportive mental wellness companion. They designed me to be here for you emotionally. Namely, Jhon Paul Noquiana and Ian John Dosdos.",
                "My creators are a team of developers passionate about mental health support. They built me to provide a caring space for emotional conversations. Namely, Jhon Paul Noquiana and Ian John Dosdos."
            ],
            'grateful': [
                "You're very welcome. I'm glad I could be here for you.",
                "It means a lot to hear that. I'm always here whenever you need support."
            ],
            'goodbye': [
                "Take care of yourself. I'm here whenever you need to talk.",
                "Wishing you well. Remember, I'm here anytime you want to connect."
            ],
            'greeting': [
                "Hello! I'm glad you're here. How are you feeling today?",
                "Hi there! It's good to hear from you. What's on your mind?"
            ],
            'summary': [
                "I'd love to summarize our conversation for you, but I'm having trouble accessing my AI service right now. From what I remember, we've been talking about some important things. How are you feeling about everything we've discussed?",
                "I'm experiencing a technical issue that's preventing me from giving you a full summary right now. But I want you to know I've been listening to everything you've shared. What stands out most to you from our conversation?"
            ]
        }
        
        responses = fallback_responses.get(sentiment, fallback_responses['neutral'])
        return random.choice(responses)
    
    def _get_gentle_guidance(self, user_message):
        """For non-emotional messages, gently guide to emotional sharing OR provide warm redirection/cheering."""
        lower_msg = user_message.lower()
        
        # --- 1. Check if it's actually an emotional topic disguised as advice-seeking ---
        emotional_advice_topics = [
            'pregnant', 'pregnancy', 'baby', 'abort', 'relationship',
            'family', 'parents', 'girlfriend', 'boyfriend', 'friend',
            'school decision', 'life decision', 'future', 'career choice'
        ]
        
        if any(topic in lower_msg for topic in emotional_advice_topics):
            # This IS emotional support - shouldn't have reached here
            # Return supportive message
            return ("I hear you're looking for guidance on something really important. "
                   "While I can't make decisions for you, I'm here to support you emotionally "
                   "as you think through your options. What feelings are coming up for you around this?")
        
        # --- 2. Check for Task/Work looking for Encouragement (CHEERLEADING) ---
        task_keywords = ['assignment', 'homework', 'project', 'studying', 'work on', 'gonna do', 'starting my', 'need to finish']
        
        if any(keyword in lower_msg for keyword in task_keywords):
            cheer_responses = [
                "That sounds like a big task! While I can't help you with the assignment itself, I can absolutely cheer you on. Remember to take breaks and be kind to yourself as you work. You've got this!",
                "I hear you're diving into some work. That takes focus! I'm here for emotional support, but I'm sending you all the motivation and good energy for your task. What's the first small step you're going to tackle?",
                "That's outside my mental wellness focus, but I admire your dedication to getting it done! Take a deep breath, break it down, and know that I'm rooting for you to succeed in your project!",
                "Great work starting that project! I can't write code or solve equations, but I can remind you to stay hydrated and step away every 45 minutes. Go get those tasks done!"
            ]
            return random.choice(cheer_responses)

        # --- 3. Check for purely factual/technical requests (WARM REDIRECTION) ---
        technical_factual_keywords = ['code', 'python', 'javascript', 'math', 'algorithm', 'function', 'formula', 'api', 'explain the concept of', 'solve for', 'define', 'history of', 'science', 'physics', 'chemistry', 'business plan', 'legal advice', 'medical diagnosis', 'how to cook', 'how to make']
        
        if any(keyword in lower_msg for keyword in technical_factual_keywords):
            redirection_responses = [
                "I'm here to support you emotionally and guide you through your feelings. For help with technical or factual questions, I recommend trying Google Search or specific expert platforms like Stack Overflow for coding questions.",
                "That's outside my area of focus, which is mental wellness and emotional support. For technical help, you might want to check out specialized resources or forums.",
                "I focus on emotional support rather than technical topics. But I'm curious, how are you feeling about tackling this challenge?"
            ]
            return random.choice(redirection_responses)
        
        # --- 4. Default gentle guidance ---
        return "I'm here primarily for emotional support and mental wellness conversations. Is there something on your mind or heart that you'd like to talk about?"
    
    def generate_mood_recommendation(self, mood, intensity, emotions, note=None):
        """
        Generate personalized recommendation based on a single mood check-in
        
        Args:
            mood: Primary mood (e.g., 'happy', 'sad', 'anxious')
            intensity: Intensity level (1-10)
            emotions: List of additional emotions
            note: Optional user note
        
        Returns:
            str: Personalized recommendation text
        """
        try:
            if not self.client:
                return self._get_fallback_mood_recommendation(mood, intensity)
            
            # Build context about the mood check-in
            emotions_text = ", ".join(emotions) if emotions else "none specified"
            note_text = f"User's note: {note}" if note else "No additional notes"
            
            # Determine severity level
            severity = self._get_severity_level(intensity)
            
            system_prompt = """You are Calmi, a compassionate mental wellness companion. You provide personalized, actionable wellness recommendations based on mood check-ins.

Your recommendations should:
1. Acknowledge and validate the user's current emotional state
2. Provide 2-3 specific, actionable steps they can take RIGHT NOW
3. Be encouraging and supportive without being dismissive
4. Match the intensity of their emotions (gentle for mild, more urgent for intense)
5. Be practical and realistic for someone in their current state

IMPORTANT:
- Keep responses concise (100-200 words)
- Focus on immediate, achievable actions
- Use a warm, conversational tone
- Don't use bullet points or lists - write in flowing paragraphs
- For high intensity (8-10), prioritize calming/grounding techniques
- For crisis situations, always recommend professional help"""

            user_prompt = f"""Generate a personalized wellness recommendation for someone who just checked in with:

    Primary Mood: {mood}
    Intensity: {intensity}/10 ({severity})
    Additional Emotions: {emotions_text}
    {note_text}

    Provide compassionate, actionable advice for what they can do right now to support their wellbeing."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=400,
                temperature=0.8,
                top_p=0.95
            )
            
            if response.choices and response.choices[0].message.content:
                recommendation = response.choices[0].message.content.strip()
                return self._clean_response_text(recommendation)
            
            return self._get_fallback_mood_recommendation(mood, intensity)
        
        except Exception as e:
            logger.error(f"Error generating mood recommendation: {e}")
            return self._get_fallback_mood_recommendation(mood, intensity)

    def generate_analytics_recommendation(self, mood_statistics):
        """
        Generate comprehensive wellness recommendation based on mood analytics
        
        Args:
            mood_statistics: Dict containing:
                - total_check_ins: Total number of mood check-ins
                - mood_distribution: Dict of mood -> count
                - average_intensity: Average intensity across all check-ins
                - common_emotions: List of most common emotions
                - time_period: Time period of analysis (e.g., "Last 30 days")
        
        Returns:
            str: Comprehensive wellness recommendation
        """
        try:
            if not self.client:
                return self._get_fallback_analytics_recommendation(mood_statistics)
            
            # Prepare statistics summary
            dominant_moods = sorted(
                mood_statistics.get('mood_distribution', {}).items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]
            
            dominant_moods_text = ", ".join([f"{mood} ({count} times)" for mood, count in dominant_moods])
            
            common_emotions = mood_statistics.get('common_emotions', [])[:5]
            emotions_text = ", ".join(common_emotions) if common_emotions else "various emotions"
            
            avg_intensity = mood_statistics.get('average_intensity', 0)
            total_checkins = mood_statistics.get('total_check_ins', 0)
            time_period = mood_statistics.get('time_period', 'recent period')
            
            system_prompt = """You are Calmi, a mental wellness companion analyzing a user's emotional patterns over time. Based on their mood check-in analytics, provide insightful, personalized wellness guidance.

    Your analysis should:
    1. Identify patterns in their emotional state (positive trends, areas of concern)
    2. Acknowledge their consistency in checking in (if applicable)
    3. Provide 3-4 strategic recommendations for long-term wellbeing
    4. Suggest specific practices, habits, or resources that align with their patterns
    5. Be encouraging about progress and gentle about challenges

    IMPORTANT:
    - Keep response 200-300 words
    - Be specific to THEIR data, not generic advice
    - Write in warm, flowing paragraphs (no bullet points or lists)
    - Celebrate positive patterns while addressing concerns compassionately
    - If patterns show distress, gently suggest professional support
    - Focus on sustainable, long-term wellness strategies"""

            user_prompt = f"""Analyze these mood check-in patterns and provide personalized wellness recommendations:

    Time Period: {time_period}
    Total Check-ins: {total_checkins}
    Most Common Moods: {dominant_moods_text}
    Average Intensity: {avg_intensity}/10
    Common Emotions: {emotions_text}

    Provide thoughtful insights and actionable recommendations for their ongoing wellness journey."""

            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ]
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                max_tokens=600,
                temperature=0.8,
                top_p=0.95
            )
            
            if response.choices and response.choices[0].message.content:
                recommendation = response.choices[0].message.content.strip()
                return self._clean_response_text(recommendation)
            
            return self._get_fallback_analytics_recommendation(mood_statistics)
            
        except Exception as e:
            logger.error(f"Error generating analytics recommendation: {e}")
            return self._get_fallback_analytics_recommendation(mood_statistics)

    def _get_severity_level(self, intensity):
        """Map intensity to severity level"""
        if intensity <= 3:
            return "mild"
        elif intensity <= 6:
            return "moderate"
        elif intensity <= 8:
            return "high"
        else:
            return "very high"

    def _get_fallback_mood_recommendation(self, mood, intensity):
        """Fallback recommendations when API is unavailable"""
        recommendations = {
            'happy': "It's wonderful that you're feeling good! To maintain this positive state, consider taking a moment to savor what's bringing you joy. Maybe share your happiness with someone or engage in an activity you love.",
            
            'sad': f"I hear that you're feeling sad{' quite intensely' if intensity > 7 else ''}. It's okay to feel this way. Consider reaching out to someone you trust, or try a gentle activity like listening to comforting music or taking a short walk. Be kind to yourself right now.",
            
            'anxious': f"Anxiety can feel overwhelming{' especially at this intensity' if intensity > 7 else ''}. Try grounding yourself with deep breathing - breathe in for 4 counts, hold for 4, out for 4. Focus on what you can control right now, and consider stepping away from stressful situations if possible.",
            
            'stressed': "When stress builds up, small breaks can make a big difference. Try a 5-minute pause to stretch, breathe, or step outside. Breaking tasks into smaller pieces can also help reduce overwhelm.",
            
            'calm': "It's lovely that you're experiencing calmness. This is a great state to build on - perhaps try some reflection, meditation, or a peaceful activity that nurtures this feeling.",
            
            'angry': f"Anger is a valid emotion{' and yours feels quite intense right now' if intensity > 7 else ''}. Before responding to whatever triggered this, try taking some space. Physical activity, deep breathing, or writing your thoughts down can help process these feelings constructively.",
            
            'lonely': "Loneliness can be really difficult. If you're able, reach out to someone - even a brief message can help. If that's not possible right now, consider engaging in a community activity or online group around something you enjoy.",
            
            'tired': "Your body and mind need rest. If possible, prioritize sleep tonight. In the meantime, gentle movement, staying hydrated, and avoiding heavy decisions can help you get through this tired period.",
            
            'confused': "When confusion sets in, it helps to step back and organize your thoughts. Try writing down what's unclear, talking it through with someone, or taking a break to return with fresh perspective.",
        }
        
        default = "Thank you for checking in with yourself. Based on how you're feeling, focus on self-care basics: rest, nourishment, movement, and connection. If these feelings persist or intensify, consider reaching out to a mental health professional."
        
        recommendation = recommendations.get(mood.lower(), default)
        
        if intensity >= 9:
            recommendation += "\n\nGiven the high intensity of what you're experiencing, please consider reaching out to a mental health professional or trusted support person. You don't have to navigate this alone."
        
        return recommendation

    def _get_fallback_analytics_recommendation(self, mood_statistics):
        """Fallback analytics recommendation when API is unavailable"""
        avg_intensity = mood_statistics.get('average_intensity', 0)
        total_checkins = mood_statistics.get('total_check_ins', 0)
        
        recommendation = f"Thank you for consistently checking in with yourself - you've recorded {total_checkins} mood entries, which shows real commitment to self-awareness. "
        
        if avg_intensity < 4:
            recommendation += "Your overall intensity levels have been relatively mild, which is encouraging. Continue maintaining the practices that support your wellbeing. "
        elif avg_intensity < 7:
            recommendation += "Your intensity levels show moderate emotional experiences. This is normal, and your awareness helps you navigate them. "
        else:
            recommendation += "Your intensity levels have been quite high. This suggests you're experiencing significant emotional challenges. Please consider additional support from a mental health professional. "
        
        recommendation += "Keep using mood check-ins as a tool for self-reflection, and remember that patterns can guide you toward what supports your wellness best."
        
        return recommendation