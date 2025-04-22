import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Events.css';

const API_URL = "http://127.0.0.1:5000";

function Events({ currentUser }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDateTime, setNewEventDateTime] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

  useEffect(() => {
    if (currentUser) {
      fetchUserEvents();
      fetchUserGroups();
    }
  }, [currentUser]);

  useEffect(() => {
    if (selectedEvent) {
      fetchEventParticipants(selectedEvent.id);
    }
  }, [selectedEvent]);

  const fetchUserGroups = async () => {
    try {
      const response = await axios.get(`${API_URL}/groups?user_id=${currentUser.id}`);
      setUserGroups(response.data);
      if (response.data.length > 0) {
        setSelectedGroupId(response.data[0].id);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const fetchUserEvents = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/events?user_id=${currentUser.id}`);
      setEvents(response.data);
      setError('');
    } catch (err) {
      setError('Failed to load events');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    if (!newEventTitle.trim() || !newEventDateTime || !selectedGroupId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      const response = await axios.post(`${API_URL}/groups/${selectedGroupId}/events`, {
        title: newEventTitle,
        description: newEventDescription,
        event_time: newEventDateTime,
        creator_id: currentUser.id
      });

      // Find the group name from userGroups if not provided in response
      const newEvent = {
        ...response.data,
        group_name: response.data.group_name || 
          userGroups.find(g => g.id === parseInt(selectedGroupId))?.name || 'Unknown Group'
      };

      setEvents([...events, newEvent]);
      resetEventForm();
    } catch (err) {
      setError('Failed to create event');
      console.error(err);
    }
  };

  const resetEventForm = () => {
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDateTime('');
    setShowCreateEvent(false);
    setError('');
  };

  const fetchEventParticipants = async (eventId) => {
    try {
      const response = await axios.get(`${API_URL}/events/${eventId}/participants`);
      setParticipants(response.data);
    } catch (err) {
      console.error('Failed to load participants:', err);
    }
  };

  const updateEventStatus = async (eventId, status) => {
    try {
      await axios.put(`${API_URL}/events/${eventId}/status`, {
        user_id: currentUser.id,
        status: status
      });
      
      // Update local state
      setEvents(events.map(event => 
        event.id === eventId 
          ? { ...event, user_status: status } 
          : event
      ));
      
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent({ ...selectedEvent, user_status: status });
        // Refresh participants
        fetchEventParticipants(eventId);
      }
    } catch (err) {
      setError('Failed to update status');
      console.error(err);
    }
  };

  const formatDateTime = (dateTimeStr) => {
    const options = { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return new Date(dateTimeStr).toLocaleDateString(undefined, options);
  };

  const isEventPast = (eventTime) => {
    return new Date(eventTime) < new Date();
  };

  const isGroupAdmin = (groupId) => {
    const group = userGroups.find(g => g.id === groupId);
    return group && group.admin === 1;
  };

  const deleteEvent = async (eventId, groupId) => {
    try {
      await axios.delete(`${API_URL}/events/${eventId}?user_id=${currentUser.id}`);
      setEvents(events.filter(event => event.id !== eventId));
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(null);
      }
    } catch (err) {
      setError('Failed to delete event');
      console.error(err);
    }
  };

  return (
    <div className="events-container">
      <div className="events-sidebar">
        <div className="events-header">
          <h2>Your Events</h2>
          <button 
            className="create-event-btn"
            onClick={() => setShowCreateEvent(!showCreateEvent)}
          >
            {showCreateEvent ? 'Cancel' : '+ New Event'}
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
            />
            <input
              type="datetime-local"
              value={newEventDateTime}
              onChange={(e) => setNewEventDateTime(e.target.value)}
            />
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
            >
              <option value="">Select a group</option>
              {userGroups.map(group => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
            <button 
              onClick={createEvent}
              disabled={!newEventTitle.trim() || !newEventDateTime || !selectedGroupId}
            >
              Create Event
            </button>
            {error && <div className="error-message">{error}</div>}
          </div>
        )}

        {loading ? (
          <div className="loading">Loading events...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : events.length === 0 ? (
          <div className="no-events">
            <p>You don't have any events yet.</p>
            <p>Events will appear here when you're added to them through your groups.</p>
          </div>
        ) : (
          <div className="events-list">
            {events.map(event => (
              <div 
                key={event.id} 
                className={`event-item ${selectedEvent && selectedEvent.id === event.id ? 'selected' : ''} ${isEventPast(event.event_time) ? 'past' : ''}`}
                onClick={() => setSelectedEvent(event)}
              >
                <div className="event-header">
                  <h3>{event.title}</h3>
                  <span className="event-group">{event.group_name}</span>
                </div>
                <div className="event-time">
                  {formatDateTime(event.event_time)}
                </div>
                <div className="event-status">
                  <span className={`status-badge ${event.user_status}`}>
                    {event.user_status === 'attending' ? 'Going' : 'Not Going'}
                  </span>
                  <span className="attendee-count">
                    {event.attending_count} attending
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="event-details">
        {selectedEvent ? (
          <>
            <div className="event-details-header">
              <div className="event-title-group">
                <h2>{selectedEvent.title}</h2>
                <span className="event-group-name">Group: {selectedEvent.group_name}</span>
              </div>
              <div className="event-actions">
                {/* {isGroupAdmin(selectedEvent.group_id) && ( */} {(
                  <button 
                    className="delete-event-btn"
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this event?')) {
                        deleteEvent(selectedEvent.id, selectedEvent.group_id);
                      }
                    }}
                  >
                    Delete Event
                  </button>
                )}
                <button 
                  className={`attend-btn ${selectedEvent.user_status === 'attending' ? 'active' : ''}`}
                  onClick={() => updateEventStatus(selectedEvent.id, 'attending')}
                  disabled={selectedEvent.user_status === 'attending'}
                >
                  I'm Going
                </button>
                <button 
                  className={`not-attend-btn ${selectedEvent.user_status === 'not_attending' ? 'active' : ''}`}
                  onClick={() => updateEventStatus(selectedEvent.id, 'not_attending')}
                  disabled={selectedEvent.user_status === 'not_attending'}
                >
                  Not Going
                </button>
              </div>
            </div>
            
            <div className="event-info">
              <div className="event-time-location">
                <div className="event-time-detail">
                  <strong>When:</strong> {formatDateTime(selectedEvent.event_time)}
                </div>
                <div className="event-group-detail">
                  <strong>Group:</strong> {selectedEvent.group_name}
                </div>
              </div>
              
              <div className="event-description">
                <h3>Description</h3>
                <p>{selectedEvent.description || 'No description provided.'}</p>
              </div>
              
              <div className="event-participants">
                <h3>Participants ({participants.filter(p => p.status === 'attending').length} attending)</h3>
                <div className="participants-list">
                  {participants.length > 0 ? (
                    <div className="participants-grid">
                      {participants.map(participant => (
                        <div 
                          key={participant.id} 
                          className={`participant-item ${participant.status}`}
                        >
                          <div className="participant-name">{participant.name}</div>
                          <div className="participant-status">
                            {participant.status === 'attending' ? 'Going' : 'Not Going'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Loading participants...</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="no-event-selected">
            <h3>Select an event to view details</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default Events; 