import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { MapPin, Phone, User, LogOut, LogIn } from 'lucide-react';
import { awsConfig } from './config';

// Configure Amplify with Cognito settings
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: awsConfig.userPoolId,
      userPoolClientId: awsConfig.userPoolWebClientId,
      loginWith: {
        oauth: {
          domain: awsConfig.oauth.domain,
          scopes: awsConfig.oauth.scope,
          redirectSignIn: [awsConfig.oauth.redirectSignIn],
          redirectSignOut: [awsConfig.oauth.redirectSignOut],
          responseType: awsConfig.oauth.responseType,
          providers: ['Google']
        }
      }
    }
  }
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showRegistration, setShowRegistration] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    address: ''
  });

  // Check if user is authenticated when app loads
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // User is authenticated, now check if they have a profile
      await loadUserData(currentUser.userId, session.tokens.idToken.payload.email);
      
    } catch (error) {
      console.log('Not authenticated:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async (userId, email) => {
    try {
      const response = await fetch(`${awsConfig.apiEndpoint}/users/${userId}`);
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setIsAuthenticated(true);
        setShowRegistration(false);
      } else if (response.status === 404) {
        // User exists in Cognito but not in database - needs registration
        setUser({ userId, email });
        setShowRegistration(true);
        setIsAuthenticated(true);
      } else {
        throw new Error('Failed to load user data');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setError('Failed to load user profile. Please try again.');
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await signInWithRedirect({ provider: 'Google' });
    } catch (error) {
      console.error('Error signing in:', error);
      setError('Failed to sign in. Please try again.');
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    try {
      const userData = {
        userId: user.userId,
        email: user.email,
        ...formData
      };

      const response = await fetch(`${awsConfig.apiEndpoint}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const result = await response.json();
        setUser(result.user);
        setShowRegistration(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save user data');
      }
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error.message || 'Failed to save profile. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setUser(null);
      setFormData({ nickname: '', phone: '', address: '' });
      setShowRegistration(false);
    } catch (error) {
      console.error('Error signing out:', error);
      setError('Failed to sign out. Please try again.');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-xl text-gray-400">Loading...</div>
      </div>
    );
  }

  // Home Page - Not authenticated (DESIGN 1: ELEGANT DARK THEME)
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
        {/* Animated background particles/lights effect */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-32 h-32 bg-amber-400 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-32 w-40 h-40 bg-orange-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '700ms'}}></div>
          <div className="absolute bottom-32 left-1/3 w-36 h-36 bg-yellow-300 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1000ms'}}></div>
          <div className="absolute bottom-20 right-20 w-32 h-32 bg-amber-500 rounded-full blur-3xl animate-pulse" style={{animationDelay: '500ms'}}></div>
        </div>

        {/* Geometric pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Main Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="max-w-4xl w-full text-center">
            
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-2xl">
                <circle cx="50" cy="50" r="48" stroke="url(#logoGradient)" strokeWidth="3" fill="none"/>
                <path d="M 30 45 Q 50 25 70 45" stroke="url(#logoGradient)" strokeWidth="4" strokeLinecap="round" fill="none"/>
                <circle cx="35" cy="50" r="6" fill="#FCD34D"/>
                <circle cx="50" cy="50" r="6" fill="#FBBF24"/>
                <circle cx="65" cy="50" r="6" fill="#F59E0B"/>
                <path d="M 30 55 L 70 55 L 65 70 L 35 70 Z" fill="url(#logoGradient)" opacity="0.3"/>
                <defs>
                  <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FCD34D"/>
                    <stop offset="50%" stopColor="#FBBF24"/>
                    <stop offset="100%" stopColor="#F59E0B"/>
                  </linearGradient>
                </defs>
              </svg>
            </div>

            {/* Tagline */}
            <div className="mb-8">
              <p className="text-amber-400 text-sm uppercase tracking-[0.3em] font-light">
                Innovative, Convenient and Smart at the Same Time
              </p>
            </div>

            {/* Main Heading */}
            <div className="mb-12">
              <h1 className="text-7xl md:text-8xl font-light text-white mb-4 tracking-tight leading-tight">
                Carpool Smarter.
              </h1>
              <h2 className="text-6xl md:text-7xl font-light text-white tracking-tight">
                Make Mornings Easy!
              </h2>
            </div>

            {/* Subtext */}
            <div className="mb-16">
              <p className="text-gray-400 text-lg font-light max-w-2xl mx-auto leading-relaxed">
                Join Challenge School families in sharing rides. 
                Save time, reduce traffic, and build community.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-8 max-w-md mx-auto p-4 bg-red-900 bg-opacity-50 backdrop-blur-sm border border-red-500 border-opacity-50 text-red-200 rounded-lg">
                {error}
              </div>
            )}

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              {/* Join Button - Primary */}
              <button
                onClick={handleGoogleLogin}
                className="group relative px-12 py-5 bg-transparent overflow-hidden"
              >
                {/* Button background with glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 opacity-90 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-400 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300"></div>
                
                {/* Button content */}
                <div className="relative flex items-center gap-3">
                  <User className="w-5 h-5 text-white" />
                  <span className="text-white font-medium text-lg tracking-wide">Join Now</span>
                </div>
              </button>

              {/* Login Button - Secondary */}
              <button
                onClick={handleGoogleLogin}
                className="group relative px-12 py-5 overflow-hidden"
              >
                {/* Button border */}
                <div className="absolute inset-0 border-2 border-white opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                
                {/* Button glow effect on hover */}
                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity duration-300"></div>
                
                {/* Button content */}
                <div className="relative flex items-center gap-3">
                  <LogIn className="w-5 h-5 text-white" />
                  <span className="text-white font-medium text-lg tracking-wide">Login</span>
                </div>
              </button>
            </div>

            {/* Bottom decorative element */}
            <div className="mt-20 flex justify-center">
              <div className="w-16 h-16 border-2 border-amber-400 border-opacity-30 rounded-full flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-400 border-opacity-50 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom tagline */}
        <div className="absolute bottom-8 left-0 right-0 text-center">
          <p className="text-gray-500 text-xs uppercase tracking-widest">
            Challenge School Ride Pool
          </p>
        </div>
      </div>
    );
  }

  // Registration Form - Authenticated but no profile
  if (showRegistration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-gray-800 bg-opacity-50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Complete Your Profile
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-900 bg-opacity-50 border border-red-500 text-red-200 rounded">
              {error}
            </div>
          )}
          
          <form onSubmit={handleRegistrationSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nickname
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={formData.nickname}
                  onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 bg-opacity-50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Enter your nickname"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 bg-opacity-50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="555-123-4567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Home Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-gray-900 bg-opacity-50 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="123 Main St, City, State"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 transition-colors duration-200"
            >
              Complete Registration
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Dashboard - Authenticated with profile
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="max-w-4xl mx-auto p-4">
        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">
                Welcome, {user.nickname}!
              </h1>
              <p className="text-gray-400">Find your carpool matches</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-red-900 bg-opacity-50 text-red-300 px-4 py-2 rounded-lg hover:bg-red-800 hover:bg-opacity-50 transition-colors border border-red-700"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Your Profile</h3>
            <div className="space-y-3 text-gray-300">
              <div className="flex items-center gap-3">
                <User className="w-5 h-5 text-amber-500" />
                <span>{user.nickname}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-amber-500" />
                <span>{user.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-amber-500" />
                <span>{user.address}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 bg-opacity-50 backdrop-blur-xl border border-gray-700 rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Available Carpools
          </h2>
          <p className="text-gray-400">
            Carpool matching feature coming soon! We'll help you find rides near your area.
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
