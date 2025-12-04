import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { signInWithRedirect, signOut, getCurrentUser, fetchAuthSession } from 'aws-amplify/auth';
import { MapPin, Phone, User, LogOut, LogIn, Edit2, Trash2, X, Users, Car, Activity } from 'lucide-react';
import { awsConfig } from './config';

// Configure Amplify with proper Cognito structure
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
  const [user, setUser] = useState(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [formData, setFormData] = useState({
    nickname: '',
    phone: '',
    address: '',
    numKids: 1,
    numSeats: 4,
    carpoolStatus: 'looking'
  });
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const carpoolStatusOptions = [
    { value: 'looking', label: 'Looking for Carpool', color: 'text-green-400' },
    { value: 'offering', label: 'Offering Rides', color: 'text-blue-400' },
    { value: 'matched', label: 'Already Matched', color: 'text-amber-400' },
    { value: 'inactive', label: 'Not Active', color: 'text-gray-400' }
  ];

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    try {
      const currentUser = await getCurrentUser();
      const session = await fetchAuthSession();
      
      // Try multiple ways to get email
      let email = session.tokens?.idToken?.payload?.email;
      
      if (!email) {
        // Try getting from userAttributes
        email = currentUser?.signInDetails?.loginId;
      }
      
      if (!email) {
        console.log('No email found in session');
        setLoading(false);
        return;
      }
      
      console.log('Found email:', email);
      setUser({ ...currentUser, email });
      
      // Check if user is registered and fetch profile data
      // Using /users/{userId} route - encode email for URL
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(`${awsConfig.apiEndpoint}/users/${encodedEmail}`);
      
      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setIsRegistered(true);
      } else if (response.status === 404) {
        // User not found in database - show registration form
        setIsRegistered(false);
      }
    } catch (error) {
      console.log('No user signed in:', error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    await signInWithRedirect({ provider: 'Google' });
  }

  async function handleSignOut() {
    await signOut();
    setUser(null);
    setIsRegistered(false);
    setProfileData(null);
  }

  async function handleRegistration(e) {
    e.preventDefault();
    
    try {
      const response = await fetch(`${awsConfig.apiEndpoint}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          nickname: formData.nickname,
          phone: formData.phone,
          address: formData.address,
          numKids: parseInt(formData.numKids),
          numSeats: parseInt(formData.numSeats),
          carpoolStatus: formData.carpoolStatus
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.user || {
          email: user.email,
          ...formData,
          numKids: parseInt(formData.numKids),
          numSeats: parseInt(formData.numSeats)
        });
        setIsRegistered(true);
      }
    } catch (error) {
      console.error('Registration failed:', error);
    }
  }

  function openEditModal() {
    setEditFormData({
      nickname: profileData?.nickname || '',
      phone: profileData?.phone || '',
      address: profileData?.address || '',
      numKids: profileData?.numKids || 1,
      numSeats: profileData?.numSeats || 4,
      carpoolStatus: profileData?.carpoolStatus || 'looking'
    });
    setIsEditModalOpen(true);
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    setIsUpdating(true);
    
    try {
      const response = await fetch(`${awsConfig.apiEndpoint}/users`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          nickname: editFormData.nickname,
          phone: editFormData.phone,
          address: editFormData.address,
          numKids: parseInt(editFormData.numKids),
          numSeats: parseInt(editFormData.numSeats),
          carpoolStatus: editFormData.carpoolStatus
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data.user || {
          email: user.email,
          ...editFormData,
          numKids: parseInt(editFormData.numKids),
          numSeats: parseInt(editFormData.numSeats)
        });
        setIsEditModalOpen(false);
      }
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteProfile() {
    setIsDeleting(true);
    
    try {
      const encodedEmail = encodeURIComponent(user.email);
      const response = await fetch(`${awsConfig.apiEndpoint}/users/${encodedEmail}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setProfileData(null);
        setIsRegistered(false);
        setFormData({
          nickname: '',
          phone: '',
          address: '',
          numKids: 1,
          numSeats: 4,
          carpoolStatus: 'looking'
        });
        setIsDeleteConfirmOpen(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    } finally {
      setIsDeleting(false);
    }
  }

  function getStatusLabel(status) {
    const option = carpoolStatusOptions.find(opt => opt.value === status);
    return option ? option.label : 'Unknown';
  }

  function getStatusColor(status) {
    const option = carpoolStatusOptions.find(opt => opt.value === status);
    return option ? option.color : 'text-gray-400';
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  // HOMEPAGE - Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black relative overflow-hidden">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-20 w-96 h-96 bg-amber-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-20 right-20 w-80 h-80 bg-orange-500 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
          <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-amber-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.7s', animationDuration: '4s' }}></div>
          <div className="absolute bottom-40 left-40 w-64 h-64 bg-orange-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s', animationDuration: '4s' }}></div>
        </div>

        {/* Geometric Pattern Overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
          <div className="text-center max-w-4xl mx-auto">
            
            {/* Top Branding Section */}
            <div className="mb-12">
              {/* Domain Name Badge */}
              <div className="inline-block mb-6">
                <div className="px-6 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full backdrop-blur-sm">
                  <p className="text-amber-400 text-sm font-medium tracking-wider">
                    🌐 pooltoschool.org
                  </p>
                </div>
              </div>

              {/* Logo */}
              <div className="flex justify-center mb-4">
                <svg width="80" height="80" viewBox="0 0 100 100" className="drop-shadow-2xl">
                  {/* Outer circle - community */}
                  <circle cx="50" cy="50" r="48" fill="none" stroke="#FCD34D" strokeWidth="3" opacity="0.8"/>
                  
                  {/* Curved path - journey/route */}
                  <path d="M 30 45 Q 50 25 70 45" fill="none" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round"/>
                  
                  {/* Three circles - multiple passengers */}
                  <circle cx="30" cy="45" r="6" fill="#FCD34D"/>
                  <circle cx="50" cy="30" r="6" fill="#FBBF24"/>
                  <circle cx="70" cy="45" r="6" fill="#F59E0B"/>
                  
                  {/* Trapezoid - simplified car */}
                  <path d="M 30 55 L 70 55 L 65 70 L 35 70 Z" fill="#F59E0B" opacity="0.9"/>
                </svg>
              </div>

              {/* App Name */}
              <h1 className="text-amber-400 text-3xl sm:text-4xl font-bold mb-2 tracking-wide">
                Pool to School
              </h1>
              <p className="text-amber-400/60 text-xs sm:text-sm uppercase tracking-[0.3em] font-light">
                Challenge School Ride Pool
              </p>
            </div>

            {/* Tagline */}
            <p className="text-amber-400 text-sm uppercase tracking-[0.3em] font-light mb-8 opacity-80">
              Innovative, Convenient and Smart at the Same Time
            </p>

            {/* Main Heading */}
            <h1 className="text-white text-7xl sm:text-8xl md:text-9xl font-light mb-4 tracking-tight leading-none">
              Carpool Smarter.
            </h1>
            <h2 className="text-white text-6xl sm:text-7xl md:text-8xl font-light mb-12 tracking-tight">
              Make Mornings Easy!
            </h2>

            {/* Subtext */}
            <p className="text-gray-400 text-lg font-light max-w-2xl mx-auto leading-relaxed mb-12">
              Join Challenge School families in sharing rides. Save time, reduce traffic, and build community.
            </p>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button
                onClick={handleSignIn}
                className="group px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg text-lg font-medium transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/50 hover:scale-105 flex items-center gap-2 min-w-[200px] justify-center"
              >
                <User className="w-5 h-5" />
                Join Now
              </button>
              
              <button
                onClick={handleSignIn}
                className="group px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-lg text-lg font-medium transition-all duration-300 hover:bg-white/10 hover:border-white/50 flex items-center gap-2 min-w-[200px] justify-center"
              >
                <LogIn className="w-5 h-5" />
                Login
              </button>
            </div>

            {/* Decorative Elements */}
            <div className="mt-20 flex justify-center gap-4 opacity-30">
              <div className="w-16 h-16 rounded-full border-2 border-amber-400"></div>
              <div className="w-12 h-12 rounded-full border-2 border-amber-400 mt-4"></div>
            </div>

            {/* Bottom Tagline */}
            <p className="mt-12 text-amber-400/40 text-sm uppercase tracking-[0.2em]">
              Challenge School Ride Pool
            </p>
          </div>
        </div>
      </div>
    );
  }

  // REGISTRATION FORM - Logged in but not registered
  if (user && !isRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          {/* Branding Header */}
          <div className="text-center mb-8">
            <div className="inline-block mb-4">
              <div className="px-4 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full backdrop-blur-sm">
                <p className="text-amber-400 text-xs font-medium tracking-wider">
                  🌐 pooltoschool.org
                </p>
              </div>
            </div>
            <h2 className="text-amber-400 text-2xl font-bold mb-1">Pool to School</h2>
            <p className="text-amber-400/60 text-xs uppercase tracking-widest">Challenge School</p>
          </div>

          <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Complete Your Profile</h2>
                <p className="text-gray-400">Tell us a bit about yourself</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-3 py-2 bg-gray-700 bg-opacity-50 text-gray-400 rounded-lg hover:bg-gray-600 hover:text-white transition-all duration-300 border border-gray-600 text-sm"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
            
            <form onSubmit={handleRegistration} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full px-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nickname
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.nickname}
                    onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="Enter your nickname"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Home Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Kids
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.numKids}
                      onChange={(e) => setFormData({...formData, numKids: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Car Seats Available
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <select
                      value={formData.numSeats}
                      onChange={(e) => setFormData({...formData, numSeats: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Carpool Status
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <select
                    value={formData.carpoolStatus}
                    onChange={(e) => setFormData({...formData, carpoolStatus: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                  >
                    {carpoolStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-xl hover:shadow-amber-500/50 transition-all duration-300 hover:scale-105"
              >
                Complete Registration
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // DASHBOARD - Logged in and registered
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      {/* Header with Pool to School Branding */}
      <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <svg width="40" height="40" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="48" fill="none" stroke="#FCD34D" strokeWidth="3" opacity="0.8"/>
                <path d="M 30 45 Q 50 25 70 45" fill="none" stroke="#FBBF24" strokeWidth="4" strokeLinecap="round"/>
                <circle cx="30" cy="45" r="6" fill="#FCD34D"/>
                <circle cx="50" cy="30" r="6" fill="#FBBF24"/>
                <circle cx="70" cy="45" r="6" fill="#F59E0B"/>
                <path d="M 30 55 L 70 55 L 65 70 L 35 70 Z" fill="#F59E0B" opacity="0.9"/>
              </svg>
              <div>
                <h1 className="text-xl font-bold text-amber-400">Pool to School</h1>
                <p className="text-xs text-amber-400/60 tracking-wider">pooltoschool.org</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700 bg-opacity-50 text-gray-300 rounded-lg hover:bg-gray-600 transition-all duration-300 border border-gray-600"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* User Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Your Profile</h2>
                <div className="flex gap-2">
                  <button
                    onClick={openEditModal}
                    className="p-2 text-amber-400 hover:bg-amber-400/10 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    title="Delete Profile"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Nickname</p>
                    <p className="text-white font-medium">{profileData?.nickname || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <p className="text-white font-medium">{profileData?.phone || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Address</p>
                    <p className="text-white font-medium">{profileData?.address || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Number of Kids</p>
                    <p className="text-white font-medium">{profileData?.numKids || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Car className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Car Seats Available</p>
                    <p className="text-white font-medium">{profileData?.numSeats || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Activity className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-400">Carpool Status</p>
                    <p className={`font-medium ${getStatusColor(profileData?.carpoolStatus)}`}>
                      {getStatusLabel(profileData?.carpoolStatus)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Carpools */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-white mb-4">Available Carpools</h2>
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-amber-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="32" height="32" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="48" fill="none" stroke="#FCD34D" strokeWidth="3"/>
                    <path d="M 30 45 Q 50 25 70 45" fill="none" stroke="#FBBF24" strokeWidth="4"/>
                    <circle cx="30" cy="45" r="6" fill="#FCD34D"/>
                    <circle cx="50" cy="30" r="6" fill="#FBBF24"/>
                    <circle cx="70" cy="45" r="6" fill="#F59E0B"/>
                  </svg>
                </div>
                <p className="text-gray-400 mb-2">No carpools available yet</p>
                <p className="text-sm text-gray-500">Check back soon for carpool opportunities!</p>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">Edit Profile</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Nickname
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={editFormData.nickname}
                    onChange={(e) => setEditFormData({...editFormData, nickname: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="Enter your nickname"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Home Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({...editFormData, address: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition"
                    placeholder="123 Main St, City, State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Number of Kids
                  </label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <select
                      value={editFormData.numKids}
                      onChange={(e) => setEditFormData({...editFormData, numKids: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Car Seats Available
                  </label>
                  <div className="relative">
                    <Car className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                    <select
                      value={editFormData.numSeats}
                      onChange={(e) => setEditFormData({...editFormData, numSeats: e.target.value})}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                        <option key={num} value={num}>{num}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Carpool Status
                </label>
                <div className="relative">
                  <Activity className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                  <select
                    value={editFormData.carpoolStatus}
                    onChange={(e) => setEditFormData({...editFormData, carpoolStatus: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-gray-700 bg-opacity-50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition appearance-none"
                  >
                    {carpoolStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium hover:shadow-xl hover:shadow-amber-500/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 border border-gray-700 w-full max-w-sm">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500 bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Delete Profile?</h2>
              <p className="text-gray-400 mb-6">
                This action cannot be undone. Your profile and all associated data will be permanently removed.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteConfirmOpen(false)}
                  className="flex-1 px-4 py-3 bg-gray-700 text-gray-300 rounded-lg font-medium hover:bg-gray-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProfile}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;