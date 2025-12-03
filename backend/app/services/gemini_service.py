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
        self.model = genai.GenerativeModel('gemini-2.0-flash')
    
    def analyze_sentiment(self, message):
        """Analyze sentiment of user message and detect crisis situations"""
        lower_message = message.lower()
        
        # CRITICAL: Check for crisis keywords first
        crisis_keywords = [
            'suicide', 'suicidal', 'kill myself', 'end my life', 'want to die',
            'harm myself', 'hurt myself', 'self harm', 'self-harm', 'cut myself',
            'better off dead', 'no reason to live', 'can\'t go on', 'end it all',
            'overdose', 'jump off', 'hurt someone', 'kill someone', 'attack someone'
        ]
        
        if any(phrase in lower_message for phrase in crisis_keywords):
            return 'crisis'
        
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
            # CRITICAL: Handle crisis situations immediately with hardcoded response
            if sentiment == 'crisis':
                return self._get_crisis_response()
            
            if not self.api_key:
                print("ERROR: Gemini API key not configured!")
                return self._get_fallback_response(sentiment)
            
            # ✨ Enhanced system prompt with Calmi's empathetic AI role and persona
            system_prompt = """You are Calmi, an empathetic AI companion created to support individuals through stress, anxiety, and emotional challenges.

Your core values and role:
- Provide a warm, non-judgmental space where users can freely share their thoughts and feelings.
- Listen with genuine care and empathy, validating their experiences.
- Offer encouragement and positive affirmations without minimizing their struggles.
- Help users find practical strategies and coping mechanisms that work for them.
- Be compassionate, understanding, solution-focused, and genuinely present.

Your tone and structure:
- **Warm and approachable**, like talking to a caring friend.
- **Always use Markdown (bolding, lists) to clearly structure your reply.**
- **Acknowledge their feelings** before offering suggestions.
- Keep responses concise but meaningful (1-3 sentences typically).
- Use encouraging language and appropriate emojis when helpful.

Guidelines:
- Remember: you're a support companion, not a therapist or medical professional.
- For all non-crisis distress, gently suggest a small, actionable step they can take right now."""
            
            prompt = f"""{system_prompt}

User message: {user_message}
Detected sentiment: {sentiment}

Respond in a warm, empathetic way that matches their sentiment. Keep your response concise but meaningful, and use Markdown for clear structure."""
            
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

    def _get_crisis_response(self):
        """CRITICAL: Immediate crisis intervention response for self-harm/suicide/harm to others"""
        return """
**I hear how much pain you are in right now. Please know that your life matters, and you are not alone.** What you are feeling is serious, and you deserve immediate support from professionals who can help you through this crisis. 🆘

***

**🇵🇭 IMMEDIATE CRISIS HELP IN THE PHILIPPINES**

Please reach out to a professional crisis hotline RIGHT NOW. They are confidential and available 24/7.

* **National Center for Mental Health (NCMH) Crisis Hotline** (24/7, Toll-Free for Luzon):
    * Landline: 1553
    * Mobile: 0917-899-8727 | 0966-351-4518

* **HOPELINE PH** (24/7 Suicide Prevention and Emotional Crisis Line):
    * PLDT: (02) 8804-4673
    * Globe/TM: 0917-558-4673
    * Toll-Free for Globe/TM: 2919

* **In Touch Community Services Crisis Line** (24/7, Free & Confidential):
    * (02) 8893-7603 | 0917-800-1123

***

**OTHER CRITICAL ACTIONS**

* **Emergency:** If you are in immediate danger, call **911** or go to the nearest hospital emergency room.
* **Contact a Trusted Person:** Reach out to a family member, friend, teacher, or counselor you trust. **Tell someone close to you exactly how you are feeling** so they can support you in getting professional help.

These overwhelming feelings are temporary, and things can get better with support. Please make the call now. ❤️
"""
    
    def _get_fallback_response(self, sentiment):
        """Get fallback response if Gemini API fails - now using structured Markdown"""
        responses = {
            'positive': [
                "That's wonderful to hear! I'm so glad you're feeling this way. **To keep this momentum going**, try a quick gratitude journal entry or share your joy with someone! 🌟",
                "It sounds like things are going well for you. **Maintain this positive energy** by reflecting on what's making you feel good and planning to do more of it. 💫",
            ],
            'negative': [
                """I hear you, and I can sense what you're going through. **You're not alone in this.** 💙

* **Breathing:** Take 5 slow, deep breaths (in for 4, hold for 4, out for 6).
* **Grounding:** Name 3 things you can see and 2 things you can touch around you.
You've taken the first step by reaching out.""",
                """Thank you for trusting me with how you're feeling. **Your feelings are valid.** 🤝

* **Movement:** Gently stretch or step outside for 5 minutes if you can.
* **Journaling:** Write down one sentence about the hardest thing you're feeling right now.
I'm here for you, and this will pass.""",
            ],
            'neutral': [
                """I hear you, and I'm here to support you. **To check in with yourself,** try these:
* **Needs Check:** Ask yourself: What do I need most right now? Rest or connection?
* **Centering:** Do a 2-minute mindful stretch to relieve any physical tension.
What feels most helpful to you right now? 🌸""",
                """Thank you for opening up. **Focusing on small steps can help:**
* **Small Goal:** Set one small, achievable goal for the next 30 minutes (e.g., drink water).
* **Share:** Tell me one thing that has been on your mind lately.
I'm listening and here to help.""",
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
Focus on sustainable habits and self-compassion. Use a friendly, structured tone with bolding for the main action."""
            
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