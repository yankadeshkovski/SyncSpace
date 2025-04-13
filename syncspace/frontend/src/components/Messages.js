import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const Messages = ({ currentUser }) => {
  // State
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [groups, setGroups] = useState([]);
  const [showGroups, setShowGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const messagesListRef = useRef(null);

  // API endpoints
  const API_BASE = 'http://127.0.0.1:5000';
  const endpoints = {
    users: `${API_BASE}/users`,
    groups: `${API_BASE}/groups`,
    messages: `${API_BASE}/messages`,
    groupMessages: (groupId) => `${API_BASE}/groups/${groupId}/messages`
  };

  // Fetch users for group creation
  useEffect(() => {
    if (currentUser) {
      axios.get(endpoints.users)
        .then(response => {
          const filteredUsers = response.data
            .filter(user => user.id !== currentUser.id)
            .sort((a, b) => a.name.localeCompare(b.name));
          setUsers(filteredUsers);
        })
        .catch(error => {
          console.error('Error fetching users:', error);
          setError('Failed to load users. Please try again.');
        });
    }
  }, [currentUser]); 

  // Fetch groups
  useEffect(() => {
    if (currentUser) {
      axios.get(`${endpoints.groups}?user_id=${currentUser.id}`)
        .then(response => setGroups(response.data))
        .catch(error => {
          console.error('Error fetching groups:', error);
          setError('Failed to load groups. Please try again.');
        });
    }
  }, [currentUser]); 

  // Fetch messages
  const fetchMessages = useCallback((otherUserId) => {
    axios.get(`${endpoints.messages}?user_id=${currentUser.id}&other_user_id=${otherUserId}`)
      .then(response => {
        setMessages(response.data);
        setError('');
      })
      .catch(error => {
        console.error('Error fetching messages:', error);
        setError('Failed to load messages. Please try again.');
      });
  }, [currentUser.id]);

  // Fetch group messages
  const fetchGroupMessages = useCallback((groupId) => {
    axios.get(endpoints.groupMessages(groupId))
      .then(response => {
        setMessages(response.data);
        setError('');
      })
      .catch(error => {
        console.error('Error fetching group messages:', error);
        setError('Failed to load group messages. Please try again.');
      });
  }, []); 

  // Send message
  const sendMessage = useCallback(() => {
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

    if (selectedConversation.type === 'direct') {
      messageData.recipient_id = selectedConversation.id;
      axios.post(endpoints.messages, messageData)
        .then(response => {
          setNewMessage('');
          setMessages(prev => [...prev, response.data]);
        })
        .catch(error => {
          console.error('Error sending message:', error);
          setError('Failed to send message. Please try again.');
        });
    } else {
      axios.post(endpoints.groupMessages(selectedConversation.id), messageData)
        .then(response => {
          setNewMessage('');
          setMessages(prev => [...prev, response.data]);
        })
        .catch(error => {
          console.error('Error sending group message:', error);
          setError('Failed to send message. Please try again.');
        });
    }
  }, [newMessage, selectedConversation, currentUser.id]);

  // Create group
  const createGroup = () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    axios.post(endpoints.groups, {
      name: newGroupName,
      created_by: currentUser.id,
      member_ids: selectedUsers
    })
      .then(() => {
        setNewGroupName('');
        setSelectedUsers([]);
        setShowGroups(false);
        return axios.get(`${endpoints.groups}?user_id=${currentUser.id}`);
      })
      .then(response => setGroups(response.data))
      .catch(error => {
        console.error('Error creating group:', error);
        setError('Failed to create group. Please try again.');
      });
  };

  // Poll for new messages
  useEffect(() => {
    const pollMessages = () => {
      if (selectedConversation) {
        if (selectedConversation.type === 'direct') {
          fetchMessages(selectedConversation.id);
        } else {
          fetchGroupMessages(selectedConversation.id);
        }
      }
    };

    pollMessages();
    const pollInterval = setInterval(pollMessages, 5000);
    return () => clearInterval(pollInterval);
  }, [selectedConversation, currentUser.id, fetchMessages, fetchGroupMessages]);

  // Scroll messages list to bottom when messages change
  useEffect(() => {
    if (messagesListRef.current) {
      messagesListRef.current.scrollTop = messagesListRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="messages-container">
      {error && <div className="error-message">{error}</div>}
      <div className="conversations-sidebar">
        <div className="conversation-header">
          <h2>Messages</h2>
          <button onClick={() => setShowGroups(!showGroups)}>
            {showGroups ? 'Show Direct Messages' : 'Show Groups'}
          </button>
        </div>
        
        {showGroups ? (
          <>
            <div className="create-group">
              <input
                type="text"
                placeholder="Group Name"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
              />
              <div className="user-selection">
                {users.map(user => (
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
                    <label htmlFor={`user-${user.id}`}>{user.name}</label>
                  </div>
                ))}
              </div>
              <button onClick={createGroup}>Create Group</button>
            </div>
            <div className="groups-list">
              {groups.map(group => (
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
          <div className="users-list">
            {users.map(user => (
              <div
                key={user.id}
                className={`conversation-item ${selectedConversation?.id === user.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedConversation({ id: user.id, type: 'direct', name: user.name });
                  fetchMessages(user.id);
                }}
              >
                <h3>{user.name}</h3>
                <p>{user.email}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="messages-area">
        {selectedConversation ? (
          <>
            <div className="messages-header">
              <h2>{selectedConversation.name}</h2>
            </div>
            <div className="messages-list" ref={messagesListRef}>
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(message => {
                  const messageDate = new Date(message.created_at);
                  const formattedDate = messageDate.toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                  });

                  return (
                    <div
                      key={message.id}
                      className={`message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`}
                    >
                      <div className="message-sender">{message.sender_name}</div>
                      <div className="message-content">{message.content}</div>
                      <div className="message-time">{formattedDate}</div>
                    </div>
                  );
                })
              )}
            </div>
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