import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Messages from "./components/Messages";

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
    if (!currentUser) return;

    axios
      .delete(`${API_URL}/users/${currentUser.id}`)
      .then(() => {
        const updatedUser = {
          name: profileName,
          username: currentUser.username,
          password: currentUser.password,
          email: profileEmail,
        };
        return axios.post(`${API_URL}/users`, updatedUser);
      })
      .then((response) => {
        setUpdateMessage("Profile updated successfully!");
        setCurrentUser(response.data);
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
      <div>
        <h2>Login</h2>
        <input
          type="text"
          placeholder="Username"
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
        />
        <button onClick={handleLogin}>Login</button>
        {loginMessage && <p>{loginMessage}</p>}
        
        <button onClick={() => setIsCreatingUser(!isCreatingUser)}>
          {isCreatingUser ? "Back to Login" : "Create User"}
        </button>
        
        {isCreatingUser && (
          <div>
            <h3>Create User</h3>
            <input
              type="text"
              placeholder="Name"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
            />
            <input
              type="text"
              placeholder="Username"
              value={createUsername}
              onChange={(e) => setCreateUsername(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
            />
            <input
              type="email"
              placeholder="Email"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
            />
            <button onClick={handleCreateUser}>Create User</button>
            {createUserMessage && <p>{createUserMessage}</p>}
          </div>
        )}
      </div>
    );
  }

  // Render profile form
  function renderProfileForm() {
    return (
      <div>
        <h2>Profile</h2>
        <label>Name</label>
        <input
          type="text"
          placeholder="Name"
          value={profileName}
          onChange={(e) => setProfileName(e.target.value)}
        />
        <label>Username (read only)</label>
        <input
          type="text"
          placeholder="Username"
          value={currentUser ? currentUser.username : ""}
          readOnly
        />
        <label>Email</label>
        <input
          type="email"
          placeholder="Email"
          value={profileEmail}
          onChange={(e) => setProfileEmail(e.target.value)}
        />
        <button onClick={handleUpdateProfile}>Update Profile</button>
        <button onClick={handleDeleteAccount}>Delete Account</button>
        {updateMessage && <p>{updateMessage}</p>}
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
        return (
          <div>
            <h2>Groups</h2>
            <p>This is where groups will be displayed.</p>
          </div>
        );
      case "events":
        return (
          <div>
            <h2>Events</h2>
            <p>This is where events will be displayed.</p>
          </div>
        );
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
          <button onClick={() => setActiveTab("messages")}>Messages</button>
          <button onClick={() => setActiveTab("groups")}>Groups</button>
          <button onClick={() => setActiveTab("events")}>Events</button>
          <button onClick={() => setActiveTab("login")}>Login</button>
          <button onClick={() => setActiveTab("users")}>Users</button>
          <button onClick={() => setActiveTab("profile")}>Profile</button>
        </nav>
      </header>
      <main className="app-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
