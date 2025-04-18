import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Groups.css';

const API_URL = "http://127.0.0.1:5000";

function Groups({ currentUser }) {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showManageMembers, setShowManageMembers] = useState(false);

  // Fetch user's groups
  useEffect(() => {
    if (currentUser) {
      fetchGroups();
    }
  }, [currentUser]);

  // Fetch messages when a group is selected
  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMessages();
      fetchGroupMembers();
    }
  }, [selectedGroup]);

  // Fetch groups
  const fetchGroups = () => {
    axios.get(`${API_URL}/groups?user_id=${currentUser.id}`)
      .then(response => {
        setGroups(response.data);
      })
      .catch(error => {
        console.error('Error fetching groups:', error);
      });
  };

  // Fetch group messages
  const fetchGroupMessages = () => {
    if (!selectedGroup) return;
    
    axios.get(`${API_URL}/groups/${selectedGroup.id}/messages`)
      .then(response => {
        setMessages(response.data);
      })
      .catch(error => {
        console.error('Error fetching group messages:', error);
      });
  };

  // Fetch group members
  const fetchGroupMembers = () => {
    if (!selectedGroup) return;
    
    axios.get(`${API_URL}/groups/${selectedGroup.id}/members`)
      .then(response => {
        setGroupMembers(response.data);
      })
      .catch(error => {
        console.error('Error fetching group members:', error);
      });
  };

  // Send a message to the group
  const sendMessage = () => {
    if (!newMessage.trim() || !selectedGroup) return;
    
    const messageData = {
      sender_id: currentUser.id,
      content: newMessage
    };
    
    axios.post(`${API_URL}/groups/${selectedGroup.id}/messages`, messageData)
      .then(response => {
        setMessages([...messages, response.data]);
        setNewMessage('');
      })
      .catch(error => {
        console.error('Error sending message:', error);
      });
  };

  // Search for users to add to a group
  const searchUsers = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    axios.get(`${API_URL}/users/search?query=${searchQuery}&current_user_id=${currentUser.id}`)
      .then(response => {
        setSearchResults(response.data);
      })
      .catch(error => {
        console.error('Error searching users:', error);
      });
  };

  // Add/remove user from selected members
  const toggleMember = (user) => {
    if (selectedMembers.some(member => member.id === user.id)) {
      setSelectedMembers(selectedMembers.filter(member => member.id !== user.id));
    } else {
      setSelectedMembers([...selectedMembers, user]);
    }
  };

  // Create a new group
  const createGroup = () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return;
    
    const groupData = {
      name: newGroupName,
      created_by: currentUser.id,
      member_ids: selectedMembers.map(member => member.id)
    };
    
    axios.post(`${API_URL}/groups`, groupData)
      .then(() => {
        setNewGroupName('');
        setSelectedMembers([]);
        setShowCreateGroup(false);
        fetchGroups();
      })
      .catch(error => {
        console.error('Error creating group:', error);
      });
  };

  // Add a member to an existing group
  const addMemberToGroup = (memberId) => {
    if (!selectedGroup) return;
    
    const memberData = {
      user_id: memberId,
      group_id: selectedGroup.id
    };
    
    axios.post(`${API_URL}/groups/${selectedGroup.id}/members`, memberData)
      .then(() => {
        fetchGroupMembers();
        // Remove from search results
        setSearchResults(searchResults.filter(user => user.id !== memberId));
      })
      .catch(error => {
        console.error('Error adding member:', error);
      });
  };

  // Remove a member from a group
  const removeMemberFromGroup = (memberId) => {
    if (!selectedGroup || memberId === selectedGroup.created_by) return;
    
    axios.delete(`${API_URL}/groups/${selectedGroup.id}/members/${memberId}`)
      .then(() => {
        fetchGroupMembers();
      })
      .catch(error => {
        console.error('Error removing member:', error);
      });
  };

  // Filter search results to exclude existing members
  const filterSearchResults = (results) => {
    if (!groupMembers.length) return results;
    
    const memberIds = groupMembers.map(member => member.id);
    return results.filter(user => !memberIds.includes(user.id));
  };

  return (
    <div className="groups-container">
      <div className="groups-sidebar">
        <h2>My Groups</h2>
        <button 
          className="create-group-btn"
          onClick={() => setShowCreateGroup(!showCreateGroup)}
        >
          {showCreateGroup ? 'Cancel' : 'Create New Group'}
        </button>
        
        {showCreateGroup && (
          <div className="create-group-form">
            <input
              type="text"
              placeholder="Group Name"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
            />
            <div className="search-members">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && searchUsers()}
              />
              <button onClick={searchUsers}>Search</button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="search-results">
                <h4>Search Results</h4>
                <ul>
                  {searchResults.map(user => (
                    <li 
                      key={user.id}
                      className={selectedMembers.some(member => member.id === user.id) ? 'selected' : ''}
                      onClick={() => toggleMember(user)}
                    >
                      {user.name} ({user.username})
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {selectedMembers.length > 0 && (
              <div className="selected-members">
                <h4>Selected Members</h4>
                <ul>
                  {selectedMembers.map(member => (
                    <li key={member.id}>
                      {member.name}
                      <button onClick={() => toggleMember(member)}>Remove</button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            <button 
              className="create-btn"
              onClick={createGroup}
              disabled={!newGroupName.trim() || selectedMembers.length === 0}
            >
              Create Group
            </button>
          </div>
        )}
        
        <div className="groups-list">
          {groups.length > 0 ? (
            <ul>
              {groups.map(group => (
                <li 
                  key={group.id}
                  className={selectedGroup && selectedGroup.id === group.id ? 'active' : ''}
                  onClick={() => {
                    setSelectedGroup(group);
                    setShowManageMembers(false);
                  }}
                >
                  {group.name}
                  <span className="creator">Created by: {group.creator_name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p>You don't have any groups yet.</p>
          )}
        </div>
      </div>
      
      <div className="group-content">
        {selectedGroup ? (
          <>
            <div className="group-header">
              <h2>{selectedGroup.name}</h2>
              <div className="group-actions">
                <div className="group-members-count">
                  {groupMembers.length} members
                </div>
                <button 
                  className="manage-members-btn"
                  onClick={() => setShowManageMembers(!showManageMembers)}
                >
                  {showManageMembers ? 'Back to Chat' : 'Manage Members'}
                </button>
              </div>
            </div>
            
            <div className="group-body">
              {!showManageMembers ? (
                <div className="chat-container">
                  <div className="messages-container">
                    {messages.length > 0 ? (
                      <div className="messages-list">
                        {messages.map(message => (
                          <div 
                            key={message.id}
                            className={`message ${message.sender_id === currentUser.id ? 'sent' : 'received'}`}
                          >
                            <div className="message-sender">{message.sender_name}</div>
                            <div className="message-content">{message.content}</div>
                            <div className="message-time">
                              {new Date(message.created_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-messages">No messages yet. Start the conversation!</p>
                    )}
                  </div>
                  
                  <div className="message-input">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    />
                    <button onClick={sendMessage}>Send</button>
                  </div>
                </div>
              ) : (
                <div className="manage-members-container">
                  <h3>Add New Members</h3>
                  <div className="search-members">
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyUp={(e) => e.key === 'Enter' && searchUsers()}
                    />
                    <button onClick={searchUsers}>Search</button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="search-results">
                      <h4>Search Results</h4>
                      <ul>
                        {filterSearchResults(searchResults).map(user => (
                          <li key={user.id}>
                            {user.name} ({user.username})
                            <button onClick={() => addMemberToGroup(user.id)}>Add</button>
                          </li>
                        ))}
                      </ul>
                      {filterSearchResults(searchResults).length === 0 && (
                        <p className="no-results">No new users found or all users are already members</p>
                      )}
                    </div>
                  )}
                  
                  <h3>Current Members</h3>
                  <div className="current-members">
                    <ul>
                      {groupMembers.map(member => (
                        <li key={member.id}>
                          {member.name}
                          {member.id === selectedGroup.created_by ? (
                            <span className="admin-badge">Admin</span>
                          ) : (
                            <button 
                              className="remove-btn"
                              onClick={() => removeMemberFromGroup(member.id)}
                            >
                              Remove
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              
              <div className="group-members-panel">
                <h3>Group Members</h3>
                {groupMembers.length > 0 ? (
                  <ul>
                    {groupMembers.map(member => (
                      <li key={member.id}>
                        {member.name}
                        {member.id === selectedGroup.created_by && <span className="admin-badge">Admin</span>}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>Loading members...</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="no-group-selected">
            <h3>Select a group or create a new one to start chatting</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default Groups; 