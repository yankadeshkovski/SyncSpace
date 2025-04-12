import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const Messages = ({ currentUser }) => {
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [groups, setGroups] = useState([]);
  const [showGroups, setShowGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const messagesEndRef = useRef(null);

  // Fetch users for group creation
  useEffect(() => {
    if (currentUser) {
      axios.get('http://127.0.0.1:5000/users')
        .then(response => {
          // Filter out current user and sort by name
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
      axios.get(`http://127.0.0.1:5000/groups?user_id=${currentUser.id}`)
        .then(response => {
          setGroups(response.data);
        })
        .catch(error => {
          console.error('Error fetching groups:', error);
          setError('Failed to load groups. Please try again.');
        });
    }
  }, [currentUser]);

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

    // Initial fetch
    pollMessages();

    // Set up polling interval
    const pollInterval = setInterval(pollMessages, 5000);

    return () => clearInterval(pollInterval);
  }, [selectedConversation, currentUser.id]);

  const fetchMessages = useCallback((otherUserId) => {
    console.log('Fetching messages between:', currentUser.id, 'and', otherUserId);
    axios.get(`http://127.0.0.1:5000/messages?user_id=${currentUser.id}&other_user_id=${otherUserId}`)
      .then(response => {
        console.log('Messages response:', response.data);
        setMessages(response.data);
        setError(''); // Clear any previous errors
        scrollToBottom();
      })
      .catch(error => {
        console.error('Error fetching messages:', error.response?.data || error.message);
        setError('Failed to load messages. Please try again.');
      });
  }, [currentUser.id]);

  const fetchGroupMessages = useCallback((groupId) => {
    console.log('Fetching group messages for group:', groupId);
    axios.get(`http://127.0.0.1:5000/groups/${groupId}/messages`)
      .then(response => {
        console.log('Group messages response:', response.data);
        setMessages(response.data);
        scrollToBottom();
      })
      .catch(error => {
        console.error('Error fetching group messages:', error.response?.data || error.message);
        setError('Failed to load group messages. Please try again.');
      });
  }, []);

  const sendMessage = useCallback(() => {
    if (!newMessage.trim()) {
      setError('Message cannot be empty');
      return;
    }
    if (!selectedConversation) {
      setError('No conversation selected');
      return;
    }

    setError('');

    const messageData = {
      sender_id: currentUser.id,
      content: newMessage
    };

    console.log('Sending message:', messageData);

    if (selectedConversation.type === 'direct') {
      messageData.recipient_id = selectedConversation.id;
      axios.post('http://127.0.0.1:5000/messages', messageData)
        .then(response => {
          console.log('Message sent successfully:', response.data);
          setNewMessage('');
          // Add the new message to the messages array
          setMessages(prevMessages => [...prevMessages, response.data]);
          scrollToBottom();
        })
        .catch(error => {
          console.error('Error sending message:', error.response?.data || error.message);
          setError('Failed to send message. Please try again.');
        });
    } else {
      axios.post(`http://127.0.0.1:5000/groups/${selectedConversation.id}/messages`, messageData)
        .then(response => {
          console.log('Group message sent successfully:', response.data);
          setNewMessage('');
          // Add the new message to the messages array
          setMessages(prevMessages => [...prevMessages, response.data]);
          scrollToBottom();
        })
        .catch(error => {
          console.error('Error sending group message:', error.response?.data || error.message);
          setError('Failed to send message. Please try again.');
        });
    }
  }, [newMessage, selectedConversation, currentUser.id]);

  const createGroup = () => {
    if (!newGroupName.trim()) {
      setError('Please enter a group name');
      return;
    }
    if (selectedUsers.length === 0) {
      setError('Please select at least one member');
      return;
    }

    setError('');

    axios.post('http://127.0.0.1:5000/groups', {
      name: newGroupName,
      created_by: currentUser.id,
      member_ids: selectedUsers
    })
      .then(response => {
        setNewGroupName('');
        setSelectedUsers([]);
        setShowGroups(false);
        // Refresh groups list
        return axios.get(`http://127.0.0.1:5000/groups?user_id=${currentUser.id}`);
      })
      .then(response => {
        setGroups(response.data);
      })
      .catch(error => {
        console.error('Error creating group:', error);
        setError('Failed to create group. Please try again.');
      });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

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
            <div className="messages-list">
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
                    <div className="message-time">
                      {new Date(message.created_at).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
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