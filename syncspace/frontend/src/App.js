import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Messages from "./components/Messages";
import Groups from "./components/Groups";
import Events from "./components/Events";

// API URL
const API_URL = "http://127.0.0.1:5000";

function App() {
  // State for users and navigation
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("login");
  const [currentUser, setCurrentUser] = useState(null);
  
  // Login state
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMessage, setLoginMessage] = useState("");
  
  // Create user state
  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createUserMessage, setCreateUserMessage] = useState("");
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  
  // Profile state
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [showUsersList, setShowUsersList] = useState(false);

  // Fetch all users
  function fetchUsers() {
    axios
      .get(`${API_URL}/users`)
      .then((response) => setUsers(response.data))
      .catch((error) => console.error("Error fetching users:", error));
  }

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Update profile fields when current user changes
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
    } else {
      setProfileName("");
      setProfileEmail("");
    }
  }, [currentUser]);

  // Login function
  function handleLogin() {
    axios
      .post(`${API_URL}/users/login`, {
        username: loginUsername,
        password: loginPassword,
      })
      .then((response) => {
        setCurrentUser(response.data);
        setLoginMessage("Login successful!");
        setActiveTab("messages");
      })
      .catch((error) => {
        setLoginMessage(
          "Login failed: " + (error.response?.data?.error || "Unknown error")
        );
      });
  }

  // Create new user
  function handleCreateUser() {
    const newUser = {
      name: createName,
      username: createUsername,
      password: createPassword,
      email: createEmail,
    };
    
    axios
      .post(`${API_URL}/users`, newUser)
      .then((response) => {
        setCurrentUser(response.data);
        setCreateUserMessage("User created successfully!");
        
        // Reset form fields
        setCreateName("");
        setCreateUsername("");
        setCreatePassword("");
        setCreateEmail("");
        
        // Navigate to messages
        setActiveTab("messages");
        
        // Refresh users list
        fetchUsers();
      })
      .catch((error) => {
        setCreateUserMessage("Error creating user: " + (error.response?.data?.error || error.message));
      });
  }

  // Update user profile
  function handleUpdateProfile() {
    if (!currentUser || profileName === currentUser.name) return;

    axios
      .put(`${API_URL}/users/${currentUser.id}`, {
        name: profileName,
        email: currentUser.email
      })
      .then(() => {
        setUpdateMessage("Display name updated successfully!");
        setCurrentUser({
          ...currentUser,
          name: profileName
        });
        fetchUsers();
      })
      .catch((error) => {
        setUpdateMessage("Error updating profile: " + (error.response?.data?.error || error.message));
      });
  }

  // Delete user account
  function handleDeleteAccount() {
    if (!currentUser) return;
    
    axios
      .delete(`${API_URL}/users/${currentUser.id}`)
      .then(() => {
        setUpdateMessage("Account deleted successfully!");
        setCurrentUser(null);
        setActiveTab("login");
        fetchUsers();
      })
      .catch((error) => {
        setUpdateMessage("Error deleting account: " + (error.response?.data?.error || error.message));
      });
  }

  // Render login/create user form
  function renderLoginForm() {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img src="/logo.png" alt="SyncSpace Logo" className="app-logo" style={{width: '300px', height: 'auto', marginTop: '200px'}} />
            <h2>Welcome to SyncSpace</h2>
            <p>{isCreatingUser ? 'Create a new account' : 'Sign in to your account'}</p>
          </div>
          
          {isCreatingUser ? (
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="create-name">Full Name</label>
                <input
                  id="create-name"
                  type="text"
                  placeholder="Enter your name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="create-username">Username</label>
                <input
                  id="create-username"
                  type="text"
                  placeholder="Choose a username"
                  value={createUsername}
                  onChange={(e) => setCreateUsername(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="create-password">Password</label>
                <input
                  id="create-password"
                  type="password"
                  placeholder="Create a password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="create-email">Email</label>
                <input
                  id="create-email"
                  type="email"
                  placeholder="Enter your email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                />
              </div>
              
              <button 
                className="auth-btn"
                onClick={handleCreateUser}
                disabled={!createName || !createUsername || !createPassword || !createEmail}
              >
                Create Account
              </button>
              
              {createUserMessage && (
                <div className={`auth-message ${createUserMessage.includes('successfully') ? 'success' : 'error'}`}>
                  {createUserMessage}
                </div>
              )}
              
              <div className="auth-switch">
                Already have an account?
                <button onClick={() => setIsCreatingUser(false)}>Sign In</button>
              </div>
            </div>
          ) : (
            <div className="auth-form">
              <div className="form-group">
                <label htmlFor="login-username">Username</label>
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              
              <button 
                className="auth-btn"
                onClick={handleLogin}
                disabled={!loginUsername || !loginPassword}
              >
                Sign In
              </button>
              
              {loginMessage && (
                <div className={`auth-message ${loginMessage.includes('successful') ? 'success' : 'error'}`}>
                  {loginMessage}
                </div>
              )}
              
              <div className="auth-divider">
                <span>OR</span>
              </div>
              
              <div className="auth-switch">
                New to SyncSpace?
                <button onClick={() => setIsCreatingUser(true)}>Create Account</button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render profile form
  function renderProfileForm() {
    return (
      <div className="profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <h2>Your Profile</h2>
            <p>Hi, {currentUser.name}!</p>
          </div>
          
          <div className="profile-form">
            <div className="form-group">
              <label htmlFor="profile-name">Display Name</label>
              <input
                id="profile-name"
                type="text"
                placeholder="Display Name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
              />
            </div>
            
            <div className="profile-info">
              <div className="info-item">
                <span className="info-label">Username:</span>
                <span className="info-value">{currentUser.username}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Email:</span>
                <span className="info-value">{currentUser.email}</span>
              </div>
            </div>
            
            <button 
              className="update-profile-btn"
              onClick={handleUpdateProfile}
              disabled={profileName === currentUser.name}
            >
              Update Display Name
            </button>
            
            {updateMessage && (
              <div className={`profile-message ${updateMessage.includes('successfully') ? 'success' : 'error'}`}>
                {updateMessage}
              </div>
            )}
            
            <div className="profile-actions">
              <button 
                className="view-users-btn"
                onClick={() => setShowUsersList(!showUsersList)}
              >
                {showUsersList ? 'Hide User List' : 'View User List'}
              </button>
            </div>
          </div>
          
          {showUsersList && (
            <div className="users-list-section">
              <h3>All Users</h3>
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Username</th>
                    <th>Email</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.username}</td>
                      <td>{user.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Render users table
  function renderUsersTable() {
    return (
      <div>
        <h2>User List</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.name}</td>
                <td>{user.username}</td>
                <td>{user.email}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Render content based on active tab
  function renderContent() {
    switch (activeTab) {
      case "login":
        return renderLoginForm();
      case "messages":
        return currentUser ? <Messages currentUser={currentUser} /> : <p>Please login to view messages</p>;
      case "groups":
        return currentUser ? <Groups currentUser={currentUser} /> : <p>Please login to view groups</p>;
      case "events":
        return currentUser ? <Events currentUser={currentUser} /> : <p>Please login to view events</p>;
      case "users":
        return renderUsersTable();
      case "profile":
        return renderProfileForm();
      default:
        return null;
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>SyncSpace</h1>
        {currentUser && <p>Hello, {currentUser.name}!</p>}
        <nav className="app-nav">
          {currentUser ? (
            <>
              <button onClick={() => setActiveTab("messages")}>Messages</button>
              <button onClick={() => setActiveTab("groups")}>Groups</button>
              <button onClick={() => setActiveTab("events")}>Events</button>
              <button onClick={() => setActiveTab("profile")}>Profile</button>
              <button onClick={() => {
                setCurrentUser(null);
                setActiveTab("login");
              }}>Logout</button>
            </>
          ) : (
            <button onClick={() => setActiveTab("login")}>Login</button>
          )}
        </nav>
      </header>
      <main className="app-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
