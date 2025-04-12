import React, { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";
import Messages from "./components/Messages";

function App() {
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("login");

  // 1. Login fields
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // 2. Create user fields
  const [createName, setCreateName] = useState("");
  const [createUsername, setCreateUsername] = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createEmail, setCreateEmail] = useState("");

  // 3. Messages to display
  const [loginMessage, setLoginMessage] = useState("");
  const [createUserMessage, setCreateUserMessage] = useState("");
  const [updateMessage, setUpdateMessage] = useState("");

  // 4. Toggling create user form
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  // 5. Current user
  const [currentUser, setCurrentUser] = useState(null);

  // 6. Profile fields (for updating)
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");

  // Add this function to fetch users
  const fetchUsers = () => {
    axios
      .get("http://127.0.0.1:5000/users")
      .then((response) => setUsers(response.data))
      .catch((error) => console.error("Error fetching users:", error));
  };

  // Update the initial useEffect to use fetchUsers
  useEffect(() => {
    fetchUsers();
  }, []);

  // Whenever currentUser changes, set the profile form fields accordingly
  useEffect(() => {
    if (currentUser) {
      setProfileName(currentUser.name);
      setProfileEmail(currentUser.email);
    } else {
      setProfileName("");
      setProfileEmail("");
    }
  }, [currentUser]);

  /**
   * LOGIN
   */
  const handleLogin = () => {
    axios
      .post("http://127.0.0.1:5000/users/login", {
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
  };

  /**
   * CREATE NEW USER
   */
  const handleCreateUser = () => {
    const newUser = {
      name: createName,
      username: createUsername,
      password: createPassword,
      email: createEmail,
    };
    axios
      .post("http://127.0.0.1:5000/users", newUser)
      .then((response) => {
        const createdUser = response.data;
        console.log("User created successfully:", createdUser);
        setCreateUserMessage("User created successfully!");
        setCurrentUser(createdUser);
        setCreateName("");
        setCreateUsername("");
        setCreatePassword("");
        setCreateEmail("");
        setActiveTab("messages");
        fetchUsers(); // Refresh the users list
      })
      .catch((error) => {
        console.error("Create user error details:", error);
        setCreateUserMessage("Error creating user: " + (error.response?.data?.error || error.message));
      });
  };

  /**
   * UPDATE PROFILE
   * 1. Delete the old user from DB
   * 2. Create a new user with updated info
   */
  const handleUpdateProfile = () => {
    if (!currentUser) return;

    axios
      .delete(`http://127.0.0.1:5000/users/${currentUser.id}`)
      .then(() => {
        const updatedUser = {
          name: profileName,
          username: currentUser.username,
          password: currentUser.password,
          email: profileEmail,
        };
        return axios.post("http://127.0.0.1:5000/users", updatedUser);
      })
      .then((response) => {
        setUpdateMessage("Profile updated successfully!");
        setCurrentUser(response.data);
        fetchUsers(); // Refresh the users list
      })
      .catch((error) => {
        setUpdateMessage(
          "Error updating profile: " + (error.response?.data?.error || error.message)
        );
      });
  };

  /**
   * DELETE ACCOUNT
   */
  const handleDeleteAccount = () => {
    if (!currentUser) return;
    axios
      .delete(`http://127.0.0.1:5000/users/${currentUser.id}`)
      .then(() => {
        setUpdateMessage("Account deleted successfully!");
        setCurrentUser(null);
        setActiveTab("login");
        fetchUsers(); // Refresh the users list
      })
      .catch((error) => {
        setUpdateMessage("Error deleting account: " + (error.response?.data?.error || error.message));
      });
  };

  /**
   * RENDER TABS
   */
  const renderContent = () => {
    if (activeTab === "login") {
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
    } else if (activeTab === "messages") {
      return currentUser ? <Messages currentUser={currentUser} /> : <p>Please login to view messages</p>;
    } else if (activeTab === "groups") {
      return (
        <div>
          <h2>Groups</h2>
          <p>This is where groups will be displayed.</p>
        </div>
      );
    } else if (activeTab === "events") {
      return (
        <div>
          <h2>Events</h2>
          <p>This is where events will be displayed.</p>
        </div>
      );
    } else if (activeTab === "profile") {
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
    return null;
  };

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
          <button onClick={() => setActiveTab("profile")}>Profile</button>
        </nav>
      </header>
      <main className="app-content">
        {renderContent()}
        {activeTab === "messages" && (
          <>
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
          </>
        )}
      </main>
    </div>
  );
}

export default App;
