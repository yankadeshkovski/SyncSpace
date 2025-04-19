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
  const [groupEvents, setGroupEvents] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDateTime, setNewEventDateTime] = useState('');

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
      fetchGroupEvents();
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

  // Fetch group events
  const fetchGroupEvents = () => {
    if (!selectedGroup) return;
    
    axios.get(`${API_URL}/groups/${selectedGroup.id}/events?user_id=${currentUser.id}`)
      .then(response => {
        setGroupEvents(response.data);
      })
      .catch(error => {
        console.error('Error fetching group events:', error);
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
    if (!selectedGroup || !isGroupAdmin()) return;
    
    axios.delete(`${API_URL}/groups/${selectedGroup.id}/members/${memberId}?admin_id=${currentUser.id}`)
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

  // Create a new event
  const createEvent = () => {
    if (!newEventTitle.trim() || !newEventDateTime) return;
    
    const eventData = {
      title: newEventTitle,
      description: newEventDescription,
      event_time: newEventDateTime,
      creator_id: currentUser.id
    };
    
    axios.post(`${API_URL}/groups/${selectedGroup.id}/events`, eventData)
      .then(response => {
        setGroupEvents([...groupEvents, response.data]);
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventDateTime('');
        setShowCreateEvent(false);
      })
      .catch(error => {
        console.error('Error creating event:', error);
      });
  };

  // Update event attendance status
  const updateEventStatus = (eventId, status) => {
    axios.put(`${API_URL}/events/${eventId}/status`, {
      user_id: currentUser.id,
      status: status
    })
      .then(() => {
        // Update local state
        setGroupEvents(groupEvents.map(event => 
          event.id === eventId 
            ? { ...event, user_status: status } 
            : event
        ));
      })
      .catch(error => {
        console.error('Error updating event status:', error);
      });
  };

  // Format date for display
  const formatDateTime = (dateTimeStr) => {
    const options = { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeStr).toLocaleDateString(undefined, options);
  };

  // Check if user is group admin
  const isGroupAdmin = () => {
    if (!selectedGroup) return false;
    const member = groupMembers.find(m => m.id === currentUser.id);
    return member && member.admin === 1;
  };

  // Delete an event
  const deleteEvent = (eventId) => {
    if (!isGroupAdmin()) return;
    
    axios.delete(`${API_URL}/events/${eventId}?user_id=${currentUser.id}`)
      .then(() => {
        setGroupEvents(groupEvents.filter(event => event.id !== eventId));
      })
      .catch(error => {
        console.error('Error deleting event:', error);
      });
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
                    setShowCreateEvent(false);
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
                  onClick={() => {
                    setShowManageMembers(!showManageMembers);
                    setShowCreateEvent(false);
                  }}
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
                          {member.admin === 1 ? (
                            <span className="admin-badge">Admin</span>
                          ) : (
                            isGroupAdmin() && (
                              <button 
                                className="remove-btn"
                                onClick={() => removeMemberFromGroup(member.id)}
                              >
                                Remove
                              </button>
                            )
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
                
                <div className="group-events-section">
                  <div className="events-header">
                    <h3>Upcoming Events</h3>
                    <button 
                      className="create-event-btn"
                      onClick={() => setShowCreateEvent(!showCreateEvent)}
                    >
                      {showCreateEvent ? 'Cancel' : '+ Event'}
                    </button>
                  </div>
                  
                  {showCreateEvent && (
                    <div className="create-event-form">
                      <input
                        type="text"
                        placeholder="Event Title"
                        value={newEventTitle}
                        onChange={(e) => setNewEventTitle(e.target.value)}
                      />
                      <textarea
                        placeholder="Event Description"
                        value={newEventDescription}
                        onChange={(e) => setNewEventDescription(e.target.value)}
                      ></textarea>
                      <input
                        type="datetime-local"
                        value={newEventDateTime}
                        onChange={(e) => setNewEventDateTime(e.target.value)}
                      />
                      <button 
                        onClick={createEvent}
                        disabled={!newEventTitle.trim() || !newEventDateTime}
                      >
                        Create Event
                      </button>
                    </div>
                  )}
                  
                  <div className="group-events-list">
                    {groupEvents.length > 0 ? (
                      <ul>
                        {groupEvents.map(event => (
                          <li key={event.id} className="group-event-item">
                            <div className="event-item-header">
                              <h4>{event.title}</h4>
                              {isGroupAdmin() && (
                                <button 
                                  className="delete-event-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteEvent(event.id);
                                  }}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                            <div className="event-item-time">{formatDateTime(event.event_time)}</div>
                            <div className="event-item-actions">
                              <button 
                                className={`attend-btn ${event.user_status === 'attending' ? 'active' : ''}`}
                                onClick={() => updateEventStatus(event.id, 'attending')}
                                disabled={event.user_status === 'attending'}
                              >
                                Going
                              </button>
                              <button 
                                className={`not-attend-btn ${event.user_status === 'not_attending' ? 'active' : ''}`}
                                onClick={() => updateEventStatus(event.id, 'not_attending')}
                                disabled={event.user_status === 'not_attending'}
                              >
                                Not Going
                              </button>
                            </div>
                            <div className="event-item-attendees">
                              {event.attending_count} attending
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="no-events">No upcoming events</p>
                    )}
                  </div>
                </div>
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