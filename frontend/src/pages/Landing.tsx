import { 
  Heart, 
  Sparkles, 
  Bot,  
  ChevronRight,
  MessageCircle,
  Calendar,
  History,
  Lightbulb,
  Clock,
  TrendingUp,
  Lock,
  Zap
} from 'lucide-react';

interface LandingProps {
  onLoginAsGuest: () => void;
  onNavigateToRegister: () => void;
  onNavigateToLogin: () => void;
}

export default function Landing({ 
  onLoginAsGuest, 
  onNavigateToRegister, 
  onNavigateToLogin 
}: LandingProps) {
  const features = [
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: '24/7 AI Companion',
      description: 'Talk anytime with Calmi, your empathetic AI that truly listens and remembers your conversations',
      color: 'from-indigo-500 to-purple-500'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Mood Check-ins',
      description: 'Track your emotional patterns daily and visualize your mental wellness journey over time',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: <History className="w-6 h-6" />,
      title: 'Chat History',
      description: 'Review past conversations and see your emotional growth (available for registered users)',
      color: 'from-emerald-500 to-green-500'
    },
    {
      icon: <Lightbulb className="w-6 h-6" />,
      title: 'Daily Inspiration',
      description: 'Receive uplifting quotes and wellness tips to brighten your day and boost your mood',
      color: 'from-amber-500 to-orange-500'
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Context-Aware AI',
      description: 'Calmi remembers your previous messages within each session for more meaningful support',
      color: 'from-pink-500 to-rose-500'
    },
    {
      icon: <Lock className="w-6 h-6" />,
      title: 'Private & Secure',
      description: 'Your conversations are encrypted and completely confidential. Your privacy matters to us',
      color: 'from-violet-500 to-purple-500'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Wellness Tips',
      description: 'Get helpful wellness recommendations based on your current emotional state',
      color: 'from-cyan-500 to-blue-500'
    },
    {
      icon: <Clock className="w-6 h-6" />,
      title: 'Crisis Resources',
      description: 'Immediate access to professional crisis helplines when you need urgent support',
      color: 'from-red-500 to-pink-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed w-full bg-white/90 backdrop-blur-md z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-xl">
                <Heart className="w-6 h-6 text-white" fill="currentColor" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Calmi
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={onNavigateToLogin}
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={onLoginAsGuest}
                className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Login as Guest
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-full mb-8">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">AI Mental Wellness Companion</span>
            </div>
            
            <h1 className="text-6xl md:text-7xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Your Personal
              </span>
              <br />
              <span className="text-gray-900">Mental Wellness</span>
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent"> Companion</span>
            </h1>
            
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              Calmi is your AI-powered emotional support system. Track your mood, 
              have meaningful conversations, and gain insights into your mental wellbeing—all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
              <button
                onClick={onLoginAsGuest}
                className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center"
              >
                Login as Guest
                <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            
            <div className="relative max-w-4xl mx-auto">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-3xl blur-2xl opacity-20"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-200 p-2">
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl p-8">
                  <div className="flex items-center space-x-3 mb-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-lg">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900">Calmi AI</h3>
                      <p className="text-sm text-gray-500">Always here to listen</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-left">
                    <div className="bg-white rounded-2xl p-4 shadow-sm max-w-xs">
                      <p className="text-gray-700">How are you feeling today?</p>
                    </div>
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl p-4 text-white max-w-xs ml-auto">
                      <p>I'm happy! Thanks for the concern.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="bg-gradient-to-b from-white to-gray-50 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Why Choose Calmi?
              </span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Everything you need for your mental wellness journey, all in one place
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-20">
            {features.map((feature, index) => (
              <div
                key={index}
                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div className={`bg-gradient-to-r ${feature.color} p-3 rounded-xl w-fit mb-6 text-white`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-12">
            <h3 className="text-3xl font-bold text-center mb-12">
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                How Calmi Works
              </span>
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: '01',
                  title: 'Share Your Feelings',
                  description: 'Have natural conversations with our empathetic AI companion that remembers your story'
                },
                {
                  step: '02',
                  title: 'Track Your Mood',
                  description: 'Check in regularly with mood tracking to monitor your emotional wellbeing over time'
                },
                {
                  step: '03',
                  title: 'Get Support',
                  description: 'Receive wellness tips and daily inspiration to support your mental health journey'
                }
              ].map((step, index) => (
                <div key={index} className="text-center">
                  <div className="bg-white w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white mx-auto mb-6">
                    {step.step}
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 mb-3">{step.title}</h4>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="relative py-20 px-6">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Start Your Wellness Journey Today
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            Experience emotional support anytime, anywhere. No credit card required.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onLoginAsGuest}
              className="group bg-white text-indigo-600 px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 inline-flex items-center justify-center"
            >
              Login as Guest
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              onClick={onNavigateToRegister}
              className="group border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all duration-300 inline-flex items-center justify-center"
            >
              Create Account
            </button>
          </div>
          
          <div className="mt-8 text-white/80">
            <p className="text-lg">
              No credit card required • Start instantly • Your privacy protected
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 p-2 rounded-lg">
                <Heart className="w-6 h-6" fill="currentColor" />
              </div>
              <span className="text-2xl font-bold">Calmi</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-gray-400">
                © {new Date().getFullYear()} Calmi. All rights reserved.
              </p>
              <p className="text-gray-500 text-sm mt-2">
                Your mental wellness journey starts here
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}