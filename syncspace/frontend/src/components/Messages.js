import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// Simple, readable Messages component
const Messages = ({ currentUser }) => {
  // --- State variables ---
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [showGroups, setShowGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [error, setError] = useState('');
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [conversationTimestamps, setConversationTimestamps] = useState({});
  
  // Reference to message list for scrolling
  const messagesListRef = useRef(null);

  // API URL
  const API_BASE = 'http://127.0.0.1:5000';

  // --- Load users when component mounts ---
  useEffect(() => {
    if (currentUser) {
      fetchUsersList();
    }
  }, [currentUser]);

  // --- Fetch groups when component mounts ---
  useEffect(() => {
    if (currentUser) {
      fetchGroupsList();
    }
  }, [currentUser]);

  // --- Auto-scroll messages when they change ---
  useEffect(() => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [messages]);

  // --- Poll for new messages ---
  useEffect(() => {
    if (!selectedConversation) return;
    
    // Initial fetch
    updateMessages();
    
    // Set up interval
    const interval = setInterval(updateMessages, 5000);
    
    // Clean up
    return () => clearInterval(interval);
  }, [selectedConversation]);

  // --- Helper Functions ---

  // Update messages based on selected conversation
  function updateMessages() {
    if (!selectedConversation) return;
    
    if (selectedConversation.type === 'direct') {
      fetchDirectMessages(selectedConversation.id);
    } else {
      fetchGroupMessages(selectedConversation.id);
    }
  }

  // Fetch list of users
  function fetchUsersList() {
    axios.get(`${API_BASE}/users`)
      .then(response => {
        // Filter out current user and sort alphabetically
        const filteredUsers = response.data
          .filter(user => user.id !== currentUser.id)
          .sort((a, b) => a.name.localeCompare(b.name));
        setUsers(filteredUsers);
      })
      .catch(error => {
        setError('Failed to load users');
      });
  }

  // Fetch list of groups
  function fetchGroupsList() {
    axios.get(`${API_BASE}/groups?user_id=${currentUser.id}`)
      .then(response => {
        setGroups(response.data);
      })
      .catch(error => {
        setError('Failed to load groups');
      });
  }

  // Fetch direct messages between two users
  function fetchDirectMessages(otherUserId) {
    axios.get(`${API_BASE}/messages?user_id=${currentUser.id}&other_user_id=${otherUserId}`)
      .then(response => {
        setMessages(response.data);
        
        // Update timestamp for sorting
        if (response.data.length > 0) {
          const newestMessage = findNewestMessage(response.data);
          updateConversationTimestamp(`user-${otherUserId}`, newestMessage.created_at);
        }
      })
      .catch(error => {
        setError('Failed to load messages');
      });
  }

  // Fetch group messages
  function fetchGroupMessages(groupId) {
    // Get messages
    axios.get(`${API_BASE}/groups/${groupId}/messages`)
      .then(response => {
        setMessages(response.data);
        
        // Update timestamp for sorting
        if (response.data.length > 0) {
          const newestMessage = findNewestMessage(response.data);
          updateConversationTimestamp(`group-${groupId}`, newestMessage.created_at);
        }
      })
      .catch(error => {
        setError('Failed to load messages');
      });
    
    // Get group members
    axios.get(`${API_BASE}/groups/${groupId}/members`)
      .then(response => {
        setGroupMembers(response.data);
      })
      .catch(error => {
        setError('Failed to load group members');
      });
  }

  // Send a new message
  function sendMessage() {
    // Validate input
    if (!newMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }
    if (!selectedConversation) {
      setError('No conversation selected');
      return;
    }

    const messageData = {
      sender_id: currentUser.id,
      content: newMessage.trim()
    };

    // Send direct message
    if (selectedConversation.type === 'direct') {
      messageData.recipient_id = selectedConversation.id;
      
      axios.post(`${API_BASE}/messages`, messageData)
        .then(response => {
          setNewMessage('');
          setMessages([...messages, response.data]);
          updateConversationTimestamp(`user-${selectedConversation.id}`, response.data.created_at);
        })
        .catch(error => {
          setError('Failed to send message');
        });
    } 
    // Send group message
    else {
      axios.post(`${API_BASE}/groups/${selectedConversation.id}/messages`, messageData)
        .then(response => {
          setNewMessage('');
          setMessages([...messages, response.data]);
          updateConversationTimestamp(`group-${selectedConversation.id}`, response.data.created_at);
        })
        .catch(error => {
          setError('Failed to send message');
        });
    }
  }

  // Create a new group
  function createGroup() {
    if (!newGroupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    axios.post(`${API_BASE}/groups`, {
      name: newGroupName,
      created_by: currentUser.id,
      member_ids: selectedUsers
    })
      .then(() => {
        // Reset form
        setNewGroupName('');
        setSelectedUsers([]);
        setShowCreateGroupForm(false);
        
        // Refresh groups list
        fetchGroupsList();
      })
      .catch(error => {
        setError('Failed to create group');
      });
  }

  // --- Utility Functions ---
  
  // Find the newest message in an array
  function findNewestMessage(messageArray) {
    return messageArray.reduce((newest, current) => {
      const newestDate = new Date(newest.created_at);
      const currentDate = new Date(current.created_at);
      return currentDate > newestDate ? current : newest;
    }, messageArray[0]);
  }
  
  // Update the timestamp for a conversation
  function updateConversationTimestamp(conversationId, timestamp) {
    setConversationTimestamps({
      ...conversationTimestamps,
      [conversationId]: timestamp
    });
  }
  
  // Sort users by most recent message
  function getSortedUsers() {
    return [...users].sort((a, b) => {
      const timeA = conversationTimestamps[`user-${a.id}`] || '2000-01-01';
      const timeB = conversationTimestamps[`user-${b.id}`] || '2000-01-01';
      return new Date(timeB) - new Date(timeA); // Most recent first
    });
  }
  
  // Sort groups by most recent message
  function getSortedGroups() {
    return [...groups].sort((a, b) => {
      const timeA = conversationTimestamps[`group-${a.id}`] || '2000-01-01';
      const timeB = conversationTimestamps[`group-${b.id}`] || '2000-01-01';
      return new Date(timeB) - new Date(timeA); // Most recent first
    });
  }

  // Format timestamp for display
  function formatMessageTime(timestamp) {
    const messageDate = new Date(timestamp);
    return messageDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // --- The Rendered Component ---
  return (
    <div className="messages-container">
      {error && <div className="error-message">{error}</div>}
      
      {/* Left sidebar */}
      <div className="conversations-sidebar">
        <div className="conversation-header">
          <h2>Messages</h2>
          <button onClick={() => setShowGroups(!showGroups)}>
            {showGroups ? 'Show Direct Messages' : 'Show Groups'}
          </button>
        </div>
        
        {/* Groups section */}
        {showGroups ? (
          <>
            {/* Group creation */}
            {showCreateGroupForm ? (
              <div className="create-group">
                <div className="create-group-header">
                  <h3>Create New Group</h3>
                  <button onClick={() => setShowCreateGroupForm(false)}>Cancel</button>
                </div>
                <input
                  type="text"
                  placeholder="Group Name"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <div className="user-selection">
                  {users.length === 0 ? (
                    <div className="no-users-message">No users available</div>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className="user-checkbox">
                        <input
                          type="checkbox"
                          id={`user-${user.id}`}
                          checked={selectedUsers.includes(user.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUsers([...selectedUsers, user.id]);
                            } else {
                              setSelectedUsers(selectedUsers.filter(id => id !== user.id));
                            }
                          }}
                        />
                        <label htmlFor={`user-${user.id}`} title={user.name}>
                          {user.name}
                        </label>
                      </div>
                    ))
                  )}
                </div>
                <button 
                  onClick={createGroup}
                  disabled={!newGroupName.trim() || selectedUsers.length === 0}
                >
                  Create Group
                </button>
              </div>
            ) : (
              <div className="create-group-button-container">
                <button 
                  className="create-group-button" 
                  onClick={() => setShowCreateGroupForm(true)}
                >
                  + Create New Group
                </button>
              </div>
            )}
            
            {/* Groups list */}
            <div className="groups-list">
              {getSortedGroups().map(group => (
                <div
                  key={group.id}
                  className={`conversation-item ${selectedConversation?.id === group.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedConversation({ id: group.id, type: 'group', name: group.name });
                    fetchGroupMessages(group.id);
                  }}
                >
                  <h3>{group.name}</h3>
                  <p>Created by: {group.creator_name}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Direct messages list */
          <div className="users-list">
            {getSortedUsers().map(user => (
              <div
                key={user.id}
                className={`conversation-item ${selectedConversation?.id === user.id && selectedConversation?.type === 'direct' ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedConversation({ id: user.id, type: 'direct', name: user.name });
                  fetchDirectMessages(user.id);
                }}
              >
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="messages-area">
        {selectedConversation ? (
          <>
            {/* Conversation header */}
            <div className="messages-header">
              <h2>{selectedConversation.name}</h2>
              {selectedConversation.type === 'group' && (
                <div className="group-members">
                  {groupMembers.length > 0 ? (
                    <>
                      Members: {groupMembers.map(member => member.name).join(', ')}
                    </>
                  ) : (
                    <span>Loading members...</span>
                  )}
                </div>
              )}
            </div>
            
            {/* Messages list */}
            <div className="messages-list" ref={messagesListRef}>
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => (
                  <div
                    key={message.id}
                    className={`message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`}
                  >
                    <div className="message-sender">{message.sender_name}</div>
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">{formatMessageTime(message.created_at)}</div>
                  </div>
                ))
              )}
            </div>
            
            {/* Message input */}
            <div className="message-input">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <div className="no-conversation">
            <p>Select a conversation or group to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages; 