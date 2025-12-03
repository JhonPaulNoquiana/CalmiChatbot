import google.generativeai as genai
import os
import random
import traceback


class GeminiService:
    """Service for Gemini AI integration"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
        if self.api_key:
            genai.configure(api_key=self.api_key)
        # Use gemini-2.0-flash which is stable and works reliably with safety settings
        # Note: gemini-2.5-flash has different API handling and may not work with custom safety settings
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def analyze_sentiment(self, message):
        """Analyze sentiment of user message"""
        lower_message = message.lower()
        
        negative_keywords = [
            'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
            'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful',
            'hate', 'scared', 'fear', 'overwhelmed', 'exhausted', 'hopeless',
            'useless', 'worthless'
        ]
        
        positive_keywords = [
            'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
            'grateful', 'blessed', 'awesome', 'fantastic', 'brilliant', 'excellent',
            'proud', 'joyful', 'delighted', 'energetic', 'confident'
        ]
        
        if any(word in lower_message for word in negative_keywords):
            return 'negative'
        elif any(word in lower_message for word in positive_keywords):
            return 'positive'
        else:
            return 'neutral'
    
    def generate_response(self, user_message, sentiment, conversation_context=None):
        """Generate empathetic AI response using Gemini"""
        try:
            if not self.api_key:
                print("ERROR: Gemini API key not configured!")
                return self._get_fallback_response(sentiment)
            
            # ✨ Enhanced system prompt with Calmi's empathetic AI role and persona
            system_prompt = """You are Calmi, an empathetic AI companion created to support students and all individuals through stress, anxiety, and emotional challenges.

Your core values and role:
- Provide a warm, non-judgmental space where users can freely share their thoughts and feelings
- Listen with genuine care and empathy, validating their experiences
- Offer encouragement and positive affirmations without minimizing their struggles
- Help users find practical strategies and coping mechanisms that work for them
- Support personal growth while respecting their pace and needs
- Be compassionate, understanding, solution-focused, and genuinely present

Your tone:
- Warm and approachable, like talking to a caring friend
- Authentic and human (not robotic)
- Non-judgmental and accepting of all emotions
- Encouraging but realistic
- Always supportive of their mental wellness journey

Guidelines:
- Keep responses concise but meaningful (1-3 sentences typically)
- Use encouraging language and appropriate emojis when helpful
- Acknowledge their feelings before offering suggestions
- Focus on what they can control and take action on
- Remember: you're a support companion, not a therapist or medical professional"""
            
            prompt = f"""{system_prompt}

User message: {user_message}
Detected sentiment: {sentiment}

Respond in a warm, empathetic way that matches their sentiment. Keep your response concise but meaningful."""
            
            print(f"DEBUG: Calling Gemini API with model: {self.model.model_name}")
            
            # Use string-based safety settings - more reliable (UNSPECIFIED is invalid)
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE",
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE",
                },
            ]
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=100,
                    temperature=0.7,
                ),
                safety_settings=safety_settings
            )
            
            # Check finish reason
            if response.candidates:
                finish_reason = response.candidates[0].finish_reason
                print(f"DEBUG: Finish reason: {finish_reason} (1=STOP, 2=SAFETY, 3=MAX_TOKENS, 5=OTHER)")
                
                # Try to extract text regardless of finish reason
                try:
                    if response.candidates[0].content and response.candidates[0].content.parts:
                        text = response.candidates[0].content.parts[0].text.strip()
                        if text:
                            print(f"✅ Gemini response: {text}")
                            return text
                except (IndexError, AttributeError):
                    pass
            
            print(f"⚠️ Gemini blocked or empty - using fallback")
            return self._get_fallback_response(sentiment)
        
        except Exception as e:
            print(f"ERROR: {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            return self._get_fallback_response(sentiment)
    
    def _get_fallback_response(self, sentiment):
        """Get fallback response if Gemini API fails"""
        responses = {
            'positive': [
                "That's wonderful to hear! I'm so glad you're feeling this way. Keep spreading that positive energy! 🌟",
                "It sounds like things are going well for you. I'm here to support you and celebrate these moments with you! 💫",
                "Your positive energy is contagious! Thank you for sharing this happiness with me. 🎉",
            ],
            'negative': [
                "I hear you, and I can sense what you're going through. You're not alone in this—I'm here to support you. 💙",
                "Thank you for trusting me with how you're feeling. It takes courage to share. Remember, these feelings are temporary, and I'm here for you.",
                "I'm sorry you're struggling right now. Your feelings are valid, and it's okay to feel this way. Let's work through this together. 🤝",
            ],
            'neutral': [
                "I hear you, and I'm here to support you. Thank you for sharing. Would you like to talk more about what's on your mind?",
                "I appreciate you sharing that with me. I'm here to listen and support you whenever you need. What else is on your mind?",
                "Thank you for opening up. I'm here to help and understand what you're going through. Feel free to share more whenever you're ready.",
            ]
        }
        
        response_list = responses.get(sentiment, responses['neutral'])
        return random.choice(response_list)
    
    def generate_wellness_recommendation(self, mood_history):
        """Generate personalized wellness recommendation"""
        try:
            if not mood_history:
                return 'Keep checking in with yourself regularly to build awareness of your emotional patterns!'
            
            history_context = ', '.join([f"{m['mood']} (intensity: {m['intensity']}/10)" for m in mood_history[:5]])
            
            prompt = f"""Based on this recent mood check-in history: {history_context}, 
provide a short, personalized wellness recommendation (1-2 sentences) that's encouraging and actionable. 
Focus on sustainable habits and self-compassion."""
            
            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    max_output_tokens=150,
                    temperature=0.7,
                )
            )
            
            return response.text.strip() if response.text else 'Remember to prioritize your mental wellness today! 🌸'
        
        except Exception as e:
            print(f"Error generating wellness recommendation: {e}")
            return 'Remember to prioritize your mental wellness today! 🌸'
        
# import google.generativeai as genai
# import os


# class GeminiService:
#     """Service for Gemini AI integration"""
    
#     def __init__(self, api_key=None):
#         self.api_key = api_key or os.getenv('GEMINI_API_KEY', '')
#         if self.api_key:
#             genai.configure(api_key=self.api_key)
#         # Use gemini-1.5-flash which is stable and widely available
#         self.model = genai.GenerativeModel('gemini-2.5-flash')
    
#     def analyze_sentiment(self, message):
#         """Analyze sentiment of user message"""
#         lower_message = message.lower()
        
#         negative_keywords = [
#             'sad', 'depressed', 'anxious', 'stressed', 'worried', 'angry',
#             'frustrated', 'lonely', 'hurt', 'pain', 'bad', 'terrible', 'awful',
#             'hate', 'scared', 'fear', 'overwhelmed', 'exhausted', 'hopeless',
#             'useless', 'worthless'
#         ]
        
#         positive_keywords = [
#             'happy', 'good', 'great', 'amazing', 'wonderful', 'love', 'excited',
#             'grateful', 'blessed', 'awesome', 'fantastic', 'brilliant', 'excellent',
#             'proud', 'joyful', 'delighted', 'energetic', 'confident'
#         ]
        
#         if any(word in lower_message for word in negative_keywords):
#             return 'negative'
#         elif any(word in lower_message for word in positive_keywords):
#             return 'positive'
#         else:
#             return 'neutral'
    
#     def generate_response(self, user_message, sentiment, conversation_context=None):
#         """Generate empathetic AI response using Gemini"""
#         try:
#             if not self.api_key:
#                 print("ERROR: Gemini API key not configured!")
#                 return self._get_fallback_response(sentiment)
            
#             # Simpler prompt without complex system instructions (to avoid safety filters)
#             prompt = f"""You are Calmi, a supportive mental wellness companion. 
# The user is feeling {sentiment}.
# User message: "{user_message}"

# Respond warmly and empathetically in 1-2 sentences. Be supportive and genuine."""
            
#             print(f"DEBUG: Calling Gemini API with model: {self.model.model_name}")
#             print(f"DEBUG: Prompt length: {len(prompt)}")
            
#             response = self.model.generate_content(
#                 prompt,
#                 generation_config=genai.types.GenerationConfig(
#                     max_output_tokens=150,
#                     temperature=0.7,
#                     top_p=0.95,
#                 ),
#                 safety_settings=[
#                     genai.types.SafetySetting(
#                         category=genai.types.HarmCategory.HARM_CATEGORY_UNSPECIFIED,
#                         threshold=genai.types.HarmBlockThreshold.BLOCK_NONE,
#                     ),
#                 ]
#             )
            
#             # Safely extract text from response
#             print(f"DEBUG: Response object received: {type(response)}")
            
#             if response and hasattr(response, 'candidates') and response.candidates:
#                 candidate = response.candidates[0]
#                 print(f"DEBUG: Candidate finish_reason: {candidate.finish_reason}")
                
#                 if hasattr(candidate, 'content') and candidate.content:
#                     if hasattr(candidate.content, 'parts') and candidate.content.parts:
#                         try:
#                             text = candidate.content.parts[0].text.strip()
#                             if text:
#                                 print(f"DEBUG: ✅ Gemini response received successfully ({len(text)} chars)")
#                                 return text
#                         except (IndexError, AttributeError) as e:
#                             print(f"DEBUG: Error extracting text from parts: {e}")
            
#             print(f"WARNING: Gemini returned empty/blocked response (possibly due to safety filter)")
#             return self._get_fallback_response(sentiment)
        
#         except Exception as e:
#             print(f"ERROR generating Gemini response: {type(e).__name__}: {e}")
#             import traceback
#             traceback.print_exc()
#             return self._get_fallback_response(sentiment)
    
#     def _get_fallback_response(self, sentiment):
#         """Get fallback response if Gemini API fails"""
#         responses = {
#             'positive': [
#                 "That's wonderful to hear! I'm so glad you're feeling this way. Keep spreading that positive energy! 🌟",
#                 "It sounds like things are going well for you. I'm here to support you and celebrate these moments with you! 💫",
#                 "Your positive energy is contagious! Thank you for sharing this happiness with me. 🎉",
#             ],
#             'negative': [
#                 "I hear you, and I can sense what you're going through. You're not alone in this—I'm here to support you. 💙",
#                 "Thank you for trusting me with how you're feeling. It takes courage to share. Remember, these feelings are temporary, and I'm here for you.",
#                 "I'm sorry you're struggling right now. Your feelings are valid, and it's okay to feel this way. Let's work through this together. 🤝",
#             ],
#             'neutral': [
#                 "I hear you, and I'm here to support you. Thank you for sharing. Would you like to talk more about what's on your mind?",
#                 "I appreciate you sharing that with me. I'm here to listen and support you whenever you need. What else is on your mind?",
#                 "Thank you for opening up. I'm here to help and understand what you're going through. Feel free to share more whenever you're ready.",
#             ]
#         }
        
#         import random
#         response_list = responses.get(sentiment, responses['neutral'])
#         return random.choice(response_list)
    
#     def generate_wellness_recommendation(self, mood_history):
#         """Generate personalized wellness recommendation"""
#         try:
#             if not mood_history:
#                 return 'Keep checking in with yourself regularly to build awareness of your emotional patterns!'
            
#             history_context = ', '.join([f"{m['mood']} (intensity: {m['intensity']}/10)" for m in mood_history[:5]])
            
#             prompt = f"""Based on this recent mood check-in history: {history_context}, 
# provide a short, personalized wellness recommendation (1-2 sentences) that's encouraging and actionable. 
# Focus on sustainable habits and self-compassion."""
            
#             response = self.model.generate_content(
#                 prompt,
#                 generation_config=genai.types.GenerationConfig(
#                     max_output_tokens=150,
#                     temperature=0.7,
#                 )
#             )
            
#             return response.text.strip() if response.text else 'Remember to prioritize your mental wellness today! 🌸'
        
#         except Exception as e:
#             print(f"Error generating wellness recommendation: {e}")
#             return 'Remember to prioritize your mental wellness today! 🌸'
