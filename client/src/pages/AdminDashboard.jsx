import React, { useState, useEffect } from 'react';
import { 
  Users, Clock, TrendingUp, UserPlus, Download, Filter, Eye, 
  CheckCircle, XCircle, X, Calendar, BarChart3, RefreshCw, 
  AlertCircle, Bell, Home, Settings, LogOut, ChevronRight, 
  ChevronDown, Maximize2, Minimize2, Battery, Activity, 
  FileText, ClipboardCheck, CalendarDays, ChevronLeft
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, 
  AreaChart, Area 
} from 'recharts';

/**
 * Helper function to get current local date in YYYY-MM-DD format
 * Used for date comparisons and API requests
 */
const getLocalDate = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Main Admin Dashboard Component
 * Provides comprehensive admin functionality for employee management,
 * time tracking, attendance monitoring, and leave management
 */
const AdminDashboard = () => {
  // ===================== STATE DECLARATIONS =====================
  
  // Core data states
  const [employees, setEmployees] = useState([]);          // List of all employees
  const [timeLogs, setTimeLogs] = useState([]);           // Employee work time logs
  const [breakLogs, setBreakLogs] = useState([]);         // Employee break logs
  const [attendanceReport, setAttendanceReport] = useState([]); // Daily attendance records
  
  // UI/UX states
  const [selectedDate, setSelectedDate] = useState(getLocalDate()); // Currently selected date for filtering
  const [showAddEmployee, setShowAddEmployee] = useState(false); // Modal visibility for adding employees
  const [selectedEmployee, setSelectedEmployee] = useState(null); // Currently selected employee for details view
  const [showNotifications, setShowNotifications] = useState(false); // Notification panel visibility
  const [collapsedSections, setCollapsedSections] = useState({}); // Track collapsed/expanded sections
  const [viewMode, setViewMode] = useState('detailed');          // View mode for logs (detailed/compact)
  const [currentAttendancePage, setCurrentAttendancePage] = useState(1); // Pagination for attendance report
  
  // Statistics states
  const [stats, setStats] = useState({
    totalEmployees: 0,    // Total number of employees
    presentToday: 0,      // Number of employees present today
    totalWorkHours: 0,    // Total work hours logged today
    avgWorkHours: 0       // Average work hours per employee
  });
  
  // Utility states
  const [, forceRender] = useState(0);      // Force component re-render for live updates
  const [prevLogs, setPrevLogs] = useState([]); // Previous logs for change detection
  const [notifications, setNotifications] = useState([]); // System notifications array
  
  // API configuration
  const API_URL = 'http://localhost:5000/api'; // Backend API base URL
  
  // ===================== MIDNIGHT AUTO-COMPLETION SYSTEM =====================
  
  /**
   * Auto-complete yesterday's unfinished work logs
   * Called automatically at midnight to ensure all logs are properly closed
   * @param {string} yesterdayDate - Date string in YYYY-MM-DD format
   */
  const autoCompleteYesterdayLogs = async (yesterdayDate) => {
    try {
      console.log('📝 Auto-completing unfinished logs for:', yesterdayDate);
      
      // Get authentication token from localStorage
      const token = localStorage.getItem('token');
      
      // First, try to use backend auto-completion endpoint if available
      try {
        const response = await fetch(`${API_URL}/admin/complete-yesterday`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ date: yesterdayDate })
        });
        
        // If backend endpoint succeeds, use its result
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Backend auto-completed logs:', result);
          return result;
        }
      } catch (backendErr) {
        console.log('Backend endpoint not available, using frontend detection only');
      }
      
      // Fallback: Frontend-only detection and completion
      // Fetch yesterday's logs from API
      const yesterdayLogs = await apiCall(`/admin/timelogs?date=${yesterdayDate}`);
      
      // Filter logs that are incomplete (not completed and not on leave)
      const incompleteLogs = yesterdayLogs.filter(log => 
        log.currentStatus !== 'completed' && 
        log.currentStatus !== 'leave' &&
        !log.leaveType
      );
      
      console.log(`Found ${incompleteLogs.length} incomplete logs from ${yesterdayDate}`);
      
      // Show notification if incomplete logs found
      if (incompleteLogs.length > 0) {
        showToast(`Detected ${incompleteLogs.length} unfinished logs from yesterday. Marking as completed.`, 'info');
        
        // Attempt to manually complete each incomplete log
        for (const log of incompleteLogs) {
          try {
            // Update each log using existing API endpoint
            await apiCall(`/admin/timelogs/${log._id}/complete`, 'PUT', {
              workMinutes: log.workMinutes || 0,
              autoCompleted: true,
              date: yesterdayDate
            });
            console.log(`✅ Manually completed log for ${log.userId?.name}`);
          } catch (updateErr) {
            console.log(`Could not update log for ${log.userId?.name}:`, updateErr.message);
          }
        }
      }
      
      // Return success response
      return {
        success: true,
        completedCount: incompleteLogs.length,
        date: yesterdayDate,
        message: `Detected ${incompleteLogs.length} incomplete logs`
      };
      
    } catch (err) {
      console.error('❌ Error auto-completing yesterday logs:', err);
      return { success: false, error: err.message };
    }
  };

  // ===================== EFFECT HOOKS =====================
  
  /**
   * Effect 1: Midnight Transition Handler with Auto-Completion
   * Detects when day changes (midnight) and auto-completes yesterday's logs
   * Runs every 30 seconds to check for date changes
   */
  useEffect(() => {
    let currentDate = getLocalDate();
    let lastProcessedMidnight = null;
    
    const checkMidnight = async () => {
      const newDate = getLocalDate();
      
      // Detect date change (midnight transition)
      if (newDate !== currentDate) {
        console.log('🌅 NEW DAY DETECTED! Date changed from', currentDate, 'to', newDate);
        
        // Create unique identifier for this midnight transition
        const midnightId = `${currentDate}_to_${newDate}`;
        
        // Prevent double-processing the same midnight transition
        if (!lastProcessedMidnight || lastProcessedMidnight !== midnightId) {
          lastProcessedMidnight = midnightId;
          
          console.log('📝 Processing midnight transition...');
          
          // Show notification to user
          showToast('New day started! Completing yesterday\'s logs...', 'info');
          
          // Auto-complete yesterday's logs before refreshing
          const result = await autoCompleteYesterdayLogs(currentDate);
          
          // Notify user about completion results
          if (result.success && result.completedCount > 0) {
            showToast(`Marked ${result.completedCount} employee(s) as completed for yesterday`, 'success');
          }
          
          console.log('🔄 Refreshing dashboard...');
          
          // Force full page reload to reset all state
          setTimeout(() => {
            window.location.reload();
          }, 1500); // 1.5 second delay to allow notifications to display
        }
      }
    };
    
    // Check for midnight every 30 seconds
    const interval = setInterval(checkMidnight, 30000);
    
    // Initial check on component mount
    checkMidnight();
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  /**
   * Effect 2: Near-Midnight Warning System
   * Shows visual warnings 5 minutes before and after midnight
   * Runs every minute to check current time
   */
  useEffect(() => {
    const checkNearMidnight = setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      
      // Check if current time is between 23:55 and 00:05
      if ((hours === 23 && minutes >= 55) || (hours === 0 && minutes <= 5)) {
        console.log('⚠️ NEAR MIDNIGHT - System will auto-refresh and complete logs at midnight');
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(checkNearMidnight);
  }, []);

  /**
   * Effect 3: Data Fetching Interval with Date Change Detection
   * Fetches all dashboard data every 5 seconds
   * Detects date changes during interval and triggers auto-completion
   */
  useEffect(() => {
    let lastCheckedDate = getLocalDate();
    let isProcessingDateChange = false;
    
    // Initial data fetch
    fetchAllData();
    
    const interval = setInterval(async () => {
      // Prevent concurrent date change processing
      if (isProcessingDateChange) return;
      
      const currentDate = getLocalDate();
      
      // CRITICAL: Detect date change during interval check
      if (currentDate !== lastCheckedDate) {
        isProcessingDateChange = true;
        console.log('🌅 DATE CHANGED during interval check!');
        console.log('   Previous date:', lastCheckedDate);
        console.log('   Current date:', currentDate);
        
        // Auto-complete yesterday's logs
        const result = await autoCompleteYesterdayLogs(lastCheckedDate);
        
        if (result.success && result.completedCount > 0) {
          console.log(`✅ Auto-completed ${result.completedCount} logs`);
        }
        
        // Reload page immediately to refresh all data
        console.log('🔄 Reloading page immediately...');
        window.location.reload();
        return;
      }
      
      // Update last checked date
      lastCheckedDate = currentDate;
      
      // Regular data fetch
      fetchAllData();
      
      // Force re-render for live updates
      forceRender(v => v + 1);
    }, 5000); // 5-second interval for regular updates

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, [selectedDate]);

  /**
   * Effect 4: Live Update Ticker
   * Forces component re-render every second for real-time updates
   */
  useEffect(() => {
    const tick = setInterval(() => {
      forceRender(v => v + 1);
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  // ===================== DATA FETCHING FUNCTIONS =====================
  
  /**
   * Fetches all dashboard data from the backend API
   * Includes employees, time logs, break logs, and attendance reports
   * Updates statistics based on fetched data
   */
  const fetchAllData = async () => {
    try {
      const currentDate = new Date().toISOString().split('T')[0];
      console.log('📡 Fetching data for date:', selectedDate);
      
      // Fetch all data in parallel for better performance
      const [emp, logs, breaks, attendance] = await Promise.all([
        apiCall('/admin/employees'),
        apiCall(`/admin/timelogs?date=${selectedDate}`),
        apiCall(`/admin/breaklogs?date=${selectedDate}`),
        apiCall(`/admin/attendance?date=${selectedDate}`)
      ]);

      // Debug logging for API responses
      console.log('📊 API Response Debug:', {
        attendanceCount: attendance.length,
        attendanceDates: attendance.map(a => a.date),
        timeLogsCount: logs.length,
        timeLogsDates: logs.map(l => l.date),
        selectedDate
      });

      // Combine time logs with active break information
      const logsWithActiveBreak = logs.map(log => {
        const activeBreak = breaks.find(b => 
          b.timeLogId === log._id && !b.endTime
        );
        
        return {
          ...log,
          activeBreak: activeBreak || null
        };
      });

      // Update all state variables with fetched data
      setEmployees(emp);
      detectNotifications(prevLogs, logs);
      setPrevLogs(logs);
      setTimeLogs(logsWithActiveBreak);
      setBreakLogs(breaks);
      setAttendanceReport(attendance);

      // Calculate statistics
      const totalWork = logs.reduce((sum, log) => sum + (log.workMinutes || 0), 0);
      const presentCount = attendance.filter(a => 
        a.markedPresent || a.presentStatus === 'present' || a.presentStatus === 'late'
      ).length;
      
      // Update stats state
      setStats({
        totalEmployees: emp.length,
        presentToday: presentCount,
        totalWorkHours: (totalWork / 60).toFixed(2),
        avgWorkHours: logs.length > 0 ? (totalWork / 60 / logs.length).toFixed(2) : 0
      });
      
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      if (typeof showToast === 'function') {
        showToast(err.message, 'error');
      }
    }
  };

  // ===================== API UTILITY FUNCTIONS =====================
  
  /**
   * Generic API call helper function
   * Handles authentication and error responses
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
   * @param {object} body - Request body (for POST/PUT requests)
   * @returns {Promise} - Parsed JSON response
   */
  const apiCall = async (endpoint, method = 'GET', body = null) => {
    const token = localStorage.getItem('token');
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(`${API_URL}${endpoint}`, options);
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Request failed');
    }
    return res.json();
  };

  // ===================== LEAVE MANAGEMENT FUNCTIONS =====================
  
  /**
   * Approves a pending leave request
   * @param {string} id - Leave request ID
   */
  const approveLeave = async (id) => {
    try {
      await apiCall(`/attendance/leave/${id}/approve`, 'POST');
      showToast('Leave approved successfully!', 'success');
      fetchAllData(); // Refresh data after approval
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /**
   * Rejects a pending leave request
   * @param {string} id - Leave request ID
   */
  const rejectLeave = async (id) => {
    try {
      await apiCall(`/attendance/leave/${id}/reject`, 'POST');
      showToast('Leave rejected', 'info');
      fetchAllData(); // Refresh data after rejection
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ===================== EMPLOYEE MANAGEMENT FUNCTIONS =====================
  
  /**
   * Adds a new employee to the system
   * @param {object} data - Employee data (name, email, password)
   */
  const handleAddEmployee = async (data) => {
    try {
      await apiCall('/auth/add-employee', 'POST', data);
      showToast('Employee added successfully!', 'success');
      setShowAddEmployee(false); // Close modal
      fetchAllData(); // Refresh employee list
      // Clear form fields
      document.getElementById('emp-name').value = '';
      document.getElementById('emp-email').value = '';
      document.getElementById('emp-password').value = '';
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  /**
   * Fetches detailed information about a specific employee
   * @param {string} userId - Employee ID
   */
  const viewEmployeeDetails = async (userId) => {
    try {
      const data = await apiCall(`/admin/employee/${userId}`);
      setSelectedEmployee(data); // Open employee details modal
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // ===================== DATA EXPORT FUNCTIONS =====================
  
  /**
   * Exports current time logs to CSV file
   * Creates a downloadable CSV file with work report data
   */
  const exportToCSV = () => {
    // Prepare CSV headers
    const csvContent = [
      ['Name', 'Email', 'Date', 'Work Hours', 'Break Minutes', 'Status', 'Leave Type'],
      // Map time logs to CSV rows
      ...timeLogs.map(log => [
        log.userId?.name || 'N/A',
        log.userId?.email || 'N/A',
        log.date,
        (log.workMinutes / 60).toFixed(2),
        log.breakMinutes,
        log.currentStatus || 'N/A',
        log.leaveType || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `work-report-${selectedDate}.csv`;
    a.click();
    showToast('Report exported successfully!', 'success');
  };

  // ===================== DATA PROCESSING FUNCTIONS =====================
  
  /**
   * Gets pending leave requests from attendance report
   * Filters attendance records with 'pending' leave status
   */
  const pendingLeaves = attendanceReport.filter(a => a.leaveStatus === "pending");

  /**
   * Converts time slot codes to human-readable text
   * @param {string} slot - Time slot code (e.g., "morning-half")
   * @returns {string} - Human-readable time range
   */
  const getTimeSlotText = (slot) => {
    const slots = {
      "morning-half": "8:30 AM - 12:30 PM",
      "evening-half": "1:30 PM - 5:30 PM",
      "morning-short": "8:30 AM - 10:30 AM",
      "evening-short": "3:30 PM - 5:30 PM"
    };
    return slots[slot] || slot;
  };

  /**
   * Formats total seconds into human-readable time string
   * @param {number} totalSeconds - Total seconds to format
   * @returns {string} - Formatted time (e.g., "2h 30m 15s")
   */
  const formatTime = (totalSeconds) => {
    if (!totalSeconds && totalSeconds !== 0) return '0s';
    
    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  /**
   * Calculates live work minutes including current active session
   * @param {object} log - Time log object
   * @returns {number} - Total work minutes (including current active time)
   */
  const getLiveWorkMinutes = (log) => {
    let minutes = log.workMinutes || 0;
    // Add time since start if currently working
    if (log.startTime && log.currentStatus === "working") {
      const diff = (Date.now() - new Date(log.startTime)) / 60000;
      minutes += diff;
    }
    return minutes;
  };

  /**
   * Calculates live break seconds for a specific break type
   * @param {object} log - Time log object
   * @param {string} type - Break type ('breakfast', 'lunch', 'other')
   * @returns {number} - Total break seconds (including active break)
   */
  const getLiveBreakSeconds = (log, type) => {
    if (!log) return 0;
    
    let breakSeconds = 0;
    
    // Add stored break time from summary
    if (log.breakSummary && log.breakSummary[type]) {
      breakSeconds = (log.breakSummary[type] || 0) * 60;
    }
    
    // Map break type to status string
    const breakStatusMap = {
      breakfast: 'breakfast-break',
      lunch: 'lunch-break',
      other: 'other-break'
    };
    
    // Add live break time if currently on this type of break
    if (log.currentStatus === breakStatusMap[type] && 
        log.activeBreak && 
        log.activeBreak.startTime) {
      const liveSeconds = (Date.now() - new Date(log.activeBreak.startTime)) / 1000;
      breakSeconds += liveSeconds;
    }
    
    return breakSeconds;
  };

  // ===================== NOTIFICATION SYSTEM =====================
  
  /**
   * Detects changes between old and new logs and creates notifications
   * @param {Array} oldLogs - Previous time logs
   * @param {Array} newLogs - Current time logs
   */
  const detectNotifications = (oldLogs, newLogs) => {
    if (!oldLogs || oldLogs.length === 0) return;
    if (!newLogs || newLogs.length === 0) return;

    // Compare each new log with its previous state
    newLogs.forEach((newLog) => {
      if (!newLog.userId?._id || !newLog.userId?.name) return;
      
      const oldLog = oldLogs.find(l => l.userId?._id === newLog.userId?._id);
      
      // Handle new log entries (employee just started working)
      if (!oldLog) {
        if (newLog.currentStatus === "working") {
          pushNotification(`🟢 ${newLog.userId.name} started working`);
        }
        return;
      }

      const oldStatus = oldLog.currentStatus || '';
      const newStatus = newLog.currentStatus || '';

      // Detect specific status changes and create appropriate notifications
      if (oldStatus !== "working" && newStatus === "working" && !oldStatus.includes("break")) {
        pushNotification(`🟢 ${newLog.userId.name} started working`);
      }
      if (oldStatus.includes("break") && newStatus === "working") {
        pushNotification(`✅ ${newLog.userId.name} ended break and resumed work`);
      }
      if (!oldStatus.includes("break") && newStatus.includes("break")) {
        const breakType = newStatus.replace('-break', '');
        pushNotification(`☕ ${newLog.userId.name} started ${breakType} break`);
      }
      if (oldStatus === "working" && newStatus === "stopped") {
        pushNotification(`⏸ ${newLog.userId.name} stopped work`);
      }
      if (oldStatus !== "completed" && newStatus === "completed") {
        pushNotification(`✓ ${newLog.userId.name} completed work for the day`);
      }
    });
  };

  /**
   * Adds a new notification to the notification system
   * @param {string} message - Notification message
   */
  const pushNotification = (message) => {
    const newNotif = {
      id: Date.now() + Math.random(), // Unique ID
      message,
      time: Date.now(), // Current timestamp
      read: false
    };
    
    setNotifications(prev => {
      // Prevent duplicate notifications within 30 seconds
      const thirtySecondsAgo = Date.now() - 30000;
      const isDuplicate = prev.some(n => 
        n.message === message && 
        n.time > thirtySecondsAgo
      );
      
      if (isDuplicate) {
        return prev;
      }
      
      // Auto-remove notification after 10 seconds
      setTimeout(() => {
        removeNotification(newNotif.id);
      }, 10000);
      
      // Play notification sound
      playNotificationSound();
      
      // Add new notification at the beginning of array
      return [newNotif, ...prev];
    });
  };

  /**
   * Plays notification sound for new notifications
   */
  const playNotificationSound = () => {
    try {
      const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3');
      audio.volume = 0.3;
      audio.play();
    } catch (e) {
      console.log('Notification sound error:', e);
    }
  };

  /**
   * Removes a specific notification by ID
   * @param {string} id - Notification ID
   */
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  /**
   * Clears all notifications
   */
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // ===================== UTILITY FUNCTIONS =====================
  
  /**
   * Counts currently active employees (status = "working")
   * @returns {number} - Count of active employees
   */
  const getActiveEmployeesCount = () => {
    return timeLogs.filter(
      log => log.currentStatus === "working"
    ).length;
  };

  /**
   * Checks if work minutes are under 8 hours (standard work day)
   * @param {number} minutes - Total work minutes
   * @returns {boolean} - True if under 8 hours
   */
  const isUnderWorking = (minutes) => {
    return (minutes / 60) < 8;
  };

  /**
   * Prepares chart data for attendance visualization
   * @returns {Array} - Array of chart data objects
   */
  const getChartData = () => {
    const present = attendanceReport.filter(a => a.markedPresent || a.presentStatus === 'present').length;
    const absent = attendanceReport.filter(a => !a.markedPresent && a.presentStatus === 'absent').length;
    const late = attendanceReport.filter(a => a.presentStatus === 'late').length;
    const onLeave = attendanceReport.filter(a => a.leaveType && a.leaveStatus === 'approved').length;

    return [
      { name: 'Present', value: present, color: '#10b981' },
      { name: 'Absent', value: absent, color: '#ef4444' },
      { name: 'Late', value: late, color: '#f59e0b' },
      { name: 'On Leave', value: onLeave, color: '#3b82f6' }
    ];
  };

  /**
   * Gets formatted today's date string
   * @returns {string} - Formatted date (e.g., "Monday, January 1, 2024")
   */
  const getTodayDate = () => {
    const today = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return today.toLocaleDateString('en-US', options);
  };

  /**
   * Checks if selected date is today
   * @returns {boolean} - True if selected date is today
   */
  const isToday = () => {
    const today = new Date().toISOString().split('T')[0];
    return selectedDate === today;
  };

  /**
   * Shows toast notification (console.log placeholder)
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, error)
   */
  const showToast = (message, type = 'info') => {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Note: Replace with actual toast notification system if available
  };

  /**
   * Toggles collapse/expand state for dashboard sections
   * @param {string} section - Section key to toggle
   */
  const toggleSection = (section) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  /**
   * Determines CSS class based on work hours for visual feedback
   * @param {number} minutes - Work minutes
   * @returns {string} - Tailwind CSS gradient class
   */
  const getWorkHoursColor = (minutes) => {
    const hours = minutes / 60;
    if (hours < 4) return 'bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30 text-red-300';
    if (hours < 6) return 'bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/30 text-orange-300';
    if (hours < 8) return 'bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30 text-yellow-300';
    return 'bg-gradient-to-r from-emerald-500/10 to-green-600/10 border-emerald-500/30 text-emerald-300';
  };

  /**
   * Formats ISO date string to readable time
   * @param {string} dateString - ISO date string
   * @returns {string} - Formatted time (HH:MM:SS)
   */
  const formatTimeForDisplay = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  /**
   * Calculates and formats break duration
   * @param {string} startTime - Break start time
   * @param {string} endTime - Break end time (null if ongoing)
   * @returns {string} - Formatted duration (e.g., "1h 30m")
   */
  const formatBreakDuration = (startTime, endTime) => {
    if (!startTime) return '0m';
    const start = new Date(startTime);
    const end = endTime ? new Date(endTime) : new Date();
    const diffMinutes = Math.floor((end - start) / 60000);
    const minutes = diffMinutes % 60;
    const hours = Math.floor(diffMinutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  /**
   * Gets emoji icon for break type
   * @param {string} type - Break type
   * @returns {string} - Emoji icon
   */
  const getBreakIcon = (type) => {
    switch(type) {
      case 'breakfast': return '🍳';
      case 'lunch': return '🍽';
      case 'other': return '☕';
      default: return '⏸';
    }
  };

  /**
   * Formats date string for display in headers
   * @param {string} dateString - Date string
   * @returns {string} - Formatted date
   */
  const formatDateForHeader = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  /**
   * Gets break sessions filtered by type for a specific date
   * @param {Array} breakLogs - Array of break logs
   * @param {string} type - Break type to filter
   * @returns {Array} - Filtered and formatted break sessions
   */
  const getBreakSessionsByType = (breakLogs, type) => {
    if (!breakLogs || !Array.isArray(breakLogs)) return [];
    
    const typeBreaks = breakLogs.filter(b => b.type === type);
    const sessions = [];
    
    // Sort breaks by start time
    const sortedBreaks = [...typeBreaks].sort((a, b) => 
      new Date(a.startTime) - new Date(b.startTime)
    );
    
    // Format each break session
    sortedBreaks.forEach(breakLog => {
      sessions.push({
        type: breakLog.type,
        startTime: breakLog.startTime,
        endTime: breakLog.endTime,
        minutes: breakLog.minutes || 0,
        duration: formatBreakDuration(breakLog.startTime, breakLog.endTime),
        isActive: !breakLog.endTime
      });
    });
    
    return sessions;
  };

  /**
   * Gets badge styling for attendance status
   * @param {string} status - Attendance status
   * @returns {object} - Badge configuration (color, text, icon)
   */
  const getAttendanceStatusBadge = (status) => {
    switch(status) {
      case 'present':
        return { 
          color: 'bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-300 border-emerald-500/30',
          text: ' Present',
          icon: '✓'
        };
      case 'late':
        return { 
          color: 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-300 border-yellow-500/30',
          text: '⚠ Late',
          icon: '⚠'
        };
      case 'absent':
        return { 
          color: 'bg-gradient-to-r from-red-500/20 to-rose-600/20 text-red-300 border-red-500/30',
          text: ' Absent',
          icon: '✗'
        };
      default:
        return { 
          color: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 border-gray-500/30',
          text: 'Not Marked',
          icon: '?'
        };
    }
  };

  /**
   * Gets badge styling for leave status
   * @param {string} status - Leave status
   * @returns {object} - Badge configuration (color, text, icon)
   */
  const getLeaveStatusBadge = (status) => {
    switch(status) {
      case 'approved':
        return { 
          color: 'bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-300 border-emerald-500/30',
          text: 'Approved',
          icon: '✓'
        };
      case 'pending':
        return { 
          color: 'bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-300 border-yellow-500/30',
          text: 'Pending',
          icon: '⏳'
        };
      case 'rejected':
        return { 
          color: 'bg-gradient-to-r from-red-500/20 to-rose-600/20 text-red-300 border-red-500/30',
          text: 'Rejected',
          icon: '✗'
        };
      default:
        return { 
          color: 'bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 border-gray-500/30',
          text: 'N/A',
          icon: '-'
        };
    }
  };

  // ===================== RENDER COMPONENT =====================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Near-Midnight Warning Indicator */}
        {(() => {
          const now = new Date();
          const hours = now.getHours();
          const minutes = now.getMinutes();
          const isNearMidnight = (hours === 23 && minutes >= 55) || (hours === 0 && minutes <= 5);
          
          if (isNearMidnight) {
            return (
              <div className="fixed bottom-4 right-4 bg-gradient-to-r from-yellow-500 to-orange-600 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse z-50 border border-yellow-400/30">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span className="font-semibold text-sm">
                    Near Midnight - Auto-refresh soon
                  </span>
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Top Navigation Bar */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-4 mb-6 border border-gray-700/50 sticky top-4 z-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="text-white w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-300 flex items-center gap-1">
                    <Calendar size={14} />
                    {getTodayDate()}
                  </p>
                  {isToday() && (
                    <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs rounded-full font-semibold flex items-center gap-1">
                      <Activity size={10} className="animate-pulse" />
                      LIVE
                    </span>
                  )}
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full font-semibold border border-blue-500/30">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              {/* Notifications Bell */}
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 rounded-xl bg-gradient-to-br from-gray-800/50 to-gray-700/50 hover:from-gray-700/70 hover:to-gray-600/70 text-gray-300 relative transition-all duration-200 hover:shadow-md border border-gray-600/50"
                >
                  <Bell size={20} />
                  {notifications.length > 0 && (
                    <>
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                        {notifications.length}
                      </span>
                      <span className="absolute top-0 right-0 w-5 h-5 bg-red-500/50 rounded-full animate-ping"></span>
                    </>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-96 bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-2xl border border-gray-700 z-50 max-h-[500px] overflow-hidden">
                    <div className="p-4 border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-white flex items-center gap-2">
                          <Bell size={18} />
                          Notifications
                          {notifications.length > 0 && (
                            <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs rounded-full">
                              {notifications.length}
                            </span>
                          )}
                        </h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-xs text-gray-400 hover:text-white hover:bg-gray-700 px-2 py-1 rounded-lg transition-colors"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[400px]">
                      {notifications.length > 0 ? (
                        notifications.map((notif, idx) => (
                          <div
                            key={notif.id}
                            className={`p-4 border-b border-gray-800 hover:bg-gray-800/50 transition-all duration-200 ${
                              idx === 0 ? 'bg-blue-500/10' : ''
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-blue-400/20 flex items-center justify-center flex-shrink-0">
                                {notif.message.includes('started working') && '🟢'}
                                {notif.message.includes('ended break') && '✅'}
                                {notif.message.includes('started') && notif.message.includes('break') && '☕'}
                                {notif.message.includes('stopped') && '⏸'}
                                {notif.message.includes('completed') && '✓'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                  {notif.message}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">
                                  {new Date(notif.time).toLocaleTimeString([], { 
                                    hour: '2-digit', 
                                    minute: '2-digit',
                                    second: '2-digit'
                                  })}
                                </p>
                              </div>
                              <button
                                onClick={() => removeNotification(notif.id)}
                                className="text-gray-500 hover:text-gray-300 hover:bg-gray-700 p-1 rounded-lg transition-colors flex-shrink-0"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-8 text-center">
                          <Bell size={32} className="mx-auto text-gray-600 mb-3" />
                          <p className="text-gray-400 text-sm">No notifications</p>
                          <p className="text-gray-500 text-xs mt-1">Real-time updates will appear here</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Add Employee Button */}
              <button
                onClick={() => setShowAddEmployee(!showAddEmployee)}
                className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 group border border-blue-500/30"
              >
                <UserPlus size={18} />
                <span className="hidden md:inline">Add Employee</span>
              </button>

              {/* Export CSV Button */}
              <button
                onClick={exportToCSV}
                className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2 border border-emerald-500/30"
              >
                <Download size={18} />
                <span className="hidden md:inline">Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showAddEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fadeIn border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">Add New Employee</h2>
                <button
                  onClick={() => setShowAddEmployee(false)}
                  className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    id="emp-name"
                    type="text"
                    placeholder="John Doe"
                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 outline-none text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    id="emp-email"
                    type="email"
                    placeholder="john@company.com"
                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 outline-none text-white placeholder-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Password
                  </label>
                  <input
                    id="emp-password"
                    type="password"
                    placeholder="••••••••"
                    className="w-full px-4 py-3 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 outline-none text-white placeholder-gray-500"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      const name = document.getElementById('emp-name').value;
                      const email = document.getElementById('emp-email').value;
                      const password = document.getElementById('emp-password').value;
                      if (name && email && password) {
                        handleAddEmployee({ name, email, password });
                      }
                    }}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 border border-blue-500/30"
                  >
                    Add Employee
                  </button>
                  <button
                    onClick={() => setShowAddEmployee(false)}
                    className="px-6 py-3 bg-gray-800/50 text-gray-300 rounded-xl hover:bg-gray-700/50 font-semibold transition-all duration-200 border border-gray-700/50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Employees Card */}
          <div className="bg-gradient-to-br from-blue-600/20 via-blue-700/20 to-blue-800/20 backdrop-blur-sm border border-blue-500/20 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
            <Users className="w-10 h-10 mb-4 opacity-90" />
            <p className="text-3xl font-bold mb-1">{stats.totalEmployees}</p>
            <p className="text-blue-300 text-sm font-medium opacity-90">Total Employees</p>
          </div>

          {/* Present Today Card */}
          <div className="bg-gradient-to-br from-emerald-600/20 via-emerald-700/20 to-emerald-800/20 backdrop-blur-sm border border-emerald-500/20 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
            <TrendingUp className="w-10 h-10 mb-4 opacity-90" />
            <p className="text-3xl font-bold mb-1">{getChartData()[0].value}</p>
            <p className="text-emerald-300 text-sm font-medium opacity-90">Present Today</p>
          </div>

          {/* Total Work Hours Card */}
          <div className="bg-gradient-to-br from-purple-600/20 via-purple-700/20 to-purple-800/20 backdrop-blur-sm border border-purple-500/20 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
            <Clock className="w-10 h-10 mb-4 opacity-90" />
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold">{stats.totalWorkHours}</p>
              <span className="text-lg opacity-90">h</span>
            </div>
            <p className="text-purple-300 text-sm font-medium opacity-90">Total Work Hours</p>
          </div>

          {/* Average Work Hours Card */}
          <div className="bg-gradient-to-br from-amber-600/20 via-amber-700/20 to-amber-800/20 backdrop-blur-sm border border-amber-500/20 rounded-2xl p-5 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-0.5 group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full -translate-y-8 translate-x-8 group-hover:scale-110 transition-transform duration-300"></div>
            <TrendingUp className="w-10 h-10 mb-4 opacity-90" />
            <div className="flex items-baseline gap-1">
              <p className="text-3xl font-bold">{stats.avgWorkHours}</p>
              <span className="text-lg opacity-90">h</span>
            </div>
            <p className="text-amber-300 text-sm font-medium opacity-90">Avg Work Hours</p>
          </div>
        </div>

        {/* Pending Leaves Section */}
        {pendingLeaves.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                  <Clock className="text-white w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-white">
                  Pending Leave Requests
                  <span className="ml-2 px-3 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-600/20 text-yellow-300 text-sm font-bold rounded-full border border-yellow-500/30">
                    {pendingLeaves.length}
                  </span>
                </h2>
              </div>
              <button
                onClick={() => toggleSection('leaves')}
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
              >
                {collapsedSections.leaves ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            {!collapsedSections.leaves && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingLeaves.map(att => (
                  <div key={att._id} className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 backdrop-blur-sm border-2 border-yellow-500/20 rounded-2xl p-5 shadow-xl hover:shadow-2xl transition-all duration-200 hover:border-yellow-500/30">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg text-white">{att.userId?.name}</p>
                        <p className="text-sm text-gray-300 truncate">{att.userId?.email}</p>
                      </div>
                      <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-600 text-white text-xs font-bold rounded-full capitalize shadow-lg">
                        {att.leaveType}
                      </span>
                    </div>
                    
                    {att.leaveTimeSlot && (
                      <p className="text-sm text-gray-300 mb-4 flex items-center gap-2">
                        <Clock size={14} />
                        {getTimeSlotText(att.leaveTimeSlot)}
                      </p>
                    )}
                    
                    {att.notes && (
                      <div className="mb-4">
                        <p className="text-xs text-gray-400 font-medium mb-1">Notes</p>
                        <p className="text-sm text-gray-300 bg-gray-800/50 p-3 rounded-lg border border-yellow-500/10">
                          "{att.notes}"
                        </p>
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => approveLeave(att._id)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 border border-emerald-500/30"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                      <button
                        onClick={() => rejectLeave(att._id)}
                        className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2 border border-red-500/30"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Date Filter Section */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-4 mb-6 border border-gray-700/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Filter size={20} className="text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-300 mb-1">Select Date</p>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-4 py-2.5 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all duration-200 text-white"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="relative">
                  <RefreshCw size={16} className="animate-spin" />
                  <div className="absolute inset-0 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <span>Auto-refresh: 5s</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-300 font-medium">View:</span>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'detailed'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                  }`}
                >
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewMode === 'compact'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
                      : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50 hover:text-gray-300'
                  }`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Employee Time Logs Section */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Clock className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Employee Time Logs</h2>
                <p className="text-sm text-gray-300">Real-time tracking for {selectedDate}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-gradient-to-r from-emerald-500/20 to-green-600/20 text-emerald-300 rounded-full text-sm font-bold flex items-center gap-2 shadow-md border border-emerald-500/30">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                Active Now: {getActiveEmployeesCount()}
              </div>
              <button
                onClick={() => toggleSection('timeLogs')}
                className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
              >
                {collapsedSections.timeLogs ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
          </div>
          
          {!collapsedSections.timeLogs && (
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-800 to-gray-900">
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">First Start</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Last Stop</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Work Hours</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Break Time</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {timeLogs.map((log) => {
                      
                      const workMinutes = getLiveWorkMinutes(log);
                      const workHours = workMinutes / 60;
                      
                      return (
                        <tr 
                          key={log._id} 
                          className={`hover:bg-gray-800/30 transition-colors duration-150 ${
                            log.leaveType ? 'bg-emerald-500/5' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-400/20 rounded-xl flex items-center justify-center font-bold text-blue-300 border border-blue-500/30">
                                {log.userId?.name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <p className="font-bold text-white">{log.userId?.name}</p>
                                {log.leaveType && (
                                  <p className="text-xs text-emerald-400 font-semibold capitalize mt-1 bg-emerald-500/10 inline-block px-2 py-1 rounded-full border border-emerald-500/20">
                                    📋 {log.leaveType} {log.leaveTimeSlot ? `(${getTimeSlotText(log.leaveTimeSlot)})` : ''}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300">
                              {log.firstStartTime ? (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatTimeForDisplay(log.firstStartTime)}
                                </div>
                              ) : "-"}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-300">
                              {log.lastStopTime ? (
                                <div className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatTimeForDisplay(log.lastStopTime)}
                                </div>
                              ) : "-"}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className={`px-3 py-2 rounded-lg border text-sm text-gray-300 font-bold text-center transition-all duration-300 ${
                              isUnderWorking(workMinutes) ? 'animate-pulse bg-gradient-to-r from-red-500/10 to-red-600/10 border-red-500/30' : getWorkHoursColor(workMinutes)
                            }`}>
                              <div className="flex items-center justify-center gap-1">
                                <Clock size={12} />
                                {formatTime(workMinutes * 60)}
                                {isUnderWorking(workMinutes) && workHours > 0 && (
                                  <span className="ml-1 text-xs text-red-300">
                                    ({workHours.toFixed(1)}h)
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          {/* Break Time Display */}
                          <td className="px-6 py-4">
                            <div className="space-y-1.5">
                              {/* Breakfast Break */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-400">Breakfast:</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  log.status === 'breakfast-break' 
                                    ? 'animate-pulse bg-gradient-to-r from-yellow-500/10 to-orange-600/10 border border-yellow-500/30 text-yellow-300' 
                                    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'
                                }`}>
                                  {log.breakSummary?.breakfast 
                                    ? `${Math.floor(log.breakSummary.breakfast)}m ${Math.floor((log.breakSummary.breakfast % 1) * 60)}s`
                                    : '0s'
                                  }
                                </span>
                              </div>
                              
                              {/* Lunch Break */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-400">Lunch:</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  log.status === 'lunch-break' 
                                    ? 'animate-pulse bg-gradient-to-r from-orange-500/10 to-red-600/10 border border-orange-500/30 text-orange-300' 
                                    : 'bg-orange-500/10 border border-orange-500/20 text-orange-400'
                                }`}>
                                  {log.breakSummary?.lunch 
                                    ? `${Math.floor(log.breakSummary.lunch)}m ${Math.floor((log.breakSummary.lunch % 1) * 60)}s`
                                    : '0s'
                                  }
                                </span>
                              </div>
                              
                              {/* Other Breaks */}
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-400">Other:</span>
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  log.status === 'other-break' 
                                    ? 'animate-pulse bg-gradient-to-r from-purple-500/10 to-indigo-600/10 border border-purple-500/30 text-purple-300' 
                                    : 'bg-purple-500/10 border border-purple-500/20 text-purple-400'
                                }`}>
                                  {log.breakSummary?.other 
                                    ? `${Math.floor(log.breakSummary.other)}m ${Math.floor((log.breakSummary.other % 1) * 60)}s`
                                    : '0s'
                                  }
                                </span>
                              </div>
                            </div>
                          </td>
                          
                          {/* Status Badge */}
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1.5 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5 ${
                              log.status === "working"
                                ? "bg-gradient-to-r from-yellow-500/10 to-amber-600/10 text-yellow-300 border border-yellow-500/30"
                                : log.status?.includes("break")
                                ? "bg-gradient-to-r from-orange-500/10 to-red-600/10 text-orange-300 border border-orange-500/30"
                                : log.status === "stopped"
                                ? "bg-gradient-to-r from-blue-500/10 to-indigo-600/10 text-blue-300 border border-blue-500/30"
                                : log.status === "completed"
                                ? "bg-gradient-to-r from-emerald-500/10 to-green-600/10 text-emerald-300 border border-emerald-500/30"
                                : "bg-gradient-to-r from-gray-500/10 to-gray-600/10 text-gray-400 border border-gray-500/30"
                            }`}>
                              {log.status === "working" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></div>
                                  Working
                                </>
                              )}
                              {log.status === "stopped" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                                  Stopped
                                </>
                              )}
                              {log.status === "completed" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                  Completed
                                </>
                              )}
                              {log.status === "breakfast-break" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                  Breakfast Break
                                </>
                              )}
                              {log.status === "lunch-break" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                  Lunch Break
                                </>
                              )}
                              {log.status === "other-break" && (
                                <>
                                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                                  Other Break
                                </>
                              )}
                              {!log.status && "-"}
                            </span>
                          </td>
                          
                          {/* View Details Button */}
                          <td className="px-6 py-4">
                            <button
                              onClick={() => viewEmployeeDetails(log.userId._id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-blue-500/10 to-blue-400/10 text-blue-300 rounded-xl hover:from-blue-600/20 hover:to-blue-500/20 hover:text-blue-200 font-semibold transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2 border border-blue-500/30"
                            >
                              <Eye size={16} />
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {timeLogs.length === 0 && (
                  <div className="text-center py-16">
                    <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No work logs for this date</p>
                    <p className="text-gray-500 text-sm mt-2">Select a different date or check back later</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Attendance Report Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg">
                <ClipboardCheck className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Attendance Report</h2>
                <p className="text-sm text-gray-300">Daily attendance summary for {selectedDate}</p>
              </div>
            </div>
            <button
              onClick={() => toggleSection('attendance')}
              className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
            >
              {collapsedSections.attendance ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {!collapsedSections.attendance && (
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-800 to-gray-900">
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Check In</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Check Out</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Leave Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {employees
                      .slice((currentAttendancePage - 1) * 6, currentAttendancePage * 6)
                      .map((emp) => {
                        const att = attendanceReport.find(a => a.userId?._id === emp._id);
                        const log = timeLogs.find(l => l.userId?._id === emp._id);
                        
                        const status = att?.markedPresent ? 'present' : (att?.presentStatus || 'absent');
                        const statusBadge = getAttendanceStatusBadge(status);
                        const leaveBadge = att?.leaveType ? getLeaveStatusBadge(att.leaveStatus) : null;
                        
                        return (
                          <tr key={emp._id} className="hover:bg-gray-800/30 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-400/20 rounded-xl flex items-center justify-center font-bold text-blue-300 border border-blue-500/30">
                                  {emp.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-white">{emp.name}</p>
                                  <p className="text-xs text-gray-400">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5 ${statusBadge.color}`}>
                                <span>{statusBadge.icon}</span>
                                {statusBadge.text}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300 font-medium">
                                {log?.firstStartTime ? formatTimeForDisplay(log.firstStartTime) : '-'}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300 font-medium">
                                {log?.lastStopTime ? formatTimeForDisplay(log.lastStopTime) : '-'}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              {att?.leaveType ? (
                                <div className="flex flex-col gap-1">
                                  <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5 ${leaveBadge.color} capitalize`}>
                                    <span>{leaveBadge.icon}</span>
                                    {att.leaveType}
                                  </span>
                                  {att.leaveTimeSlot && (
                                    <span className="text-xs text-gray-400">
                                      {getTimeSlotText(att.leaveTimeSlot)}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-sm text-gray-500">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                
                {employees.length === 0 && (
                  <div className="text-center py-16">
                    <ClipboardCheck className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No employees found</p>
                    <p className="text-gray-500 text-sm mt-2">Add employees to see attendance reports</p>
                  </div>
                )}
              </div>
              
              {/* Pagination Controls */}
              {employees.length > 6 && (
                <div className="border-t border-gray-800 px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-400">
                      Showing {(currentAttendancePage - 1) * 6 + 1} to {Math.min(currentAttendancePage * 6, employees.length)} of {employees.length} employees
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentAttendancePage(prev => Math.max(1, prev - 1))}
                        disabled={currentAttendancePage === 1}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          currentAttendancePage === 1
                            ? 'text-gray-600 cursor-not-allowed bg-gray-800/30'
                            : 'text-gray-300 bg-gray-800/50 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.ceil(employees.length / 6) }, (_, i) => i + 1)
                          .filter(page => 
                            page === 1 || 
                            page === Math.ceil(employees.length / 6) || 
                            Math.abs(page - currentAttendancePage) <= 1
                          )
                          .map((page, idx, array) => (
                            <React.Fragment key={page}>
                              {idx > 0 && array[idx - 1] !== page - 1 && (
                                <span className="px-2 text-gray-600">...</span>
                              )}
                              <button
                                onClick={() => setCurrentAttendancePage(page)}
                                className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 ${
                                  currentAttendancePage === page
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                                    : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
                                }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          ))}
                      </div>
                      
                      <button
                        onClick={() => setCurrentAttendancePage(prev => Math.min(Math.ceil(employees.length / 6), prev + 1))}
                        disabled={currentAttendancePage === Math.ceil(employees.length / 6)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1 ${
                          currentAttendancePage === Math.ceil(employees.length / 6)
                            ? 'text-gray-600 cursor-not-allowed bg-gray-800/30'
                            : 'text-gray-300 bg-gray-800/50 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Leave Report Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <CalendarDays className="text-white w-5 h-5" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Leave Report</h2>
                <p className="text-sm text-gray-300">All leave records for {selectedDate}</p>
              </div>
            </div>
            <button
              onClick={() => toggleSection('leaveReport')}
              className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
            >
              {collapsedSections.leaveReport ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
          
          {!collapsedSections.leaveReport && (
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-700/50">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-gray-800 to-gray-900">
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Employee</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Leave Type</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Time Slot</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Notes</th>
                      <th className="px-6 py-4 text-left text-sm font-bold text-gray-300">Requested On</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {attendanceReport
                      .filter(att => att.leaveType)
                      .map((att) => {
                        const leaveBadge = getLeaveStatusBadge(att.leaveStatus);
                        
                        return (
                          <tr key={att._id} className="hover:bg-gray-800/30 transition-colors duration-150">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-blue-400/20 rounded-xl flex items-center justify-center font-bold text-blue-300 border border-blue-500/30">
                                  {att.userId?.name?.charAt(0) || 'U'}
                                </div>
                                <div>
                                  <p className="font-bold text-white">{att.userId?.name}</p>
                                  <p className="text-xs text-gray-400">{att.userId?.email}</p>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className="px-4 py-2 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-indigo-600/20 text-purple-300 border border-purple-500/30 capitalize">
                                {att.leaveType}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm font-semibold text-gray-300">
                                {att.leaveTimeSlot ? getTimeSlotText(att.leaveTimeSlot) : 'Full Day'}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <span className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm inline-flex items-center gap-1.5 ${leaveBadge.color}`}>
                                <span>{leaveBadge.icon}</span>
                                {leaveBadge.text}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-400 max-w-xs truncate">
                                {att.notes || '-'}
                              </div>
                            </td>
                            
                            <td className="px-6 py-4">
                              <div className="text-sm text-gray-300">
                                {att.createdAt ? new Date(att.createdAt).toLocaleDateString() : '-'}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
                {attendanceReport.filter(att => att.leaveType).length === 0 && (
                  <div className="text-center py-16">
                    <CalendarDays className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg font-medium">No leave records for this date</p>
                    <p className="text-gray-500 text-sm mt-2">Select a different date or check pending leave requests</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Employee Details Modal */}
        {selectedEmployee && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl w-full max-w-6xl my-8 shadow-2xl border border-gray-700 animate-fadeIn">
              {/* Modal Header */}
              <div className="sticky top-0 bg-gradient-to-br from-gray-900 to-gray-800 border-b border-gray-700 rounded-t-2xl p-6 z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
                      {selectedEmployee.user.name?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedEmployee.user.name}</h2>
                      <p className="text-gray-300">{selectedEmployee.user.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedEmployee(null)}
                    className="text-gray-400 hover:text-white hover:bg-gray-700 p-2 rounded-xl transition-colors"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Work History with Break Times - CURRENT DAY ONLY */}
                <div>
                  <h3 className="font-bold text-xl mb-6 text-white flex items-center gap-2">
                    <Clock size={20} />
                    Today's Work History with Break Times
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-500/20 to-indigo-600/20 text-blue-300 text-sm font-bold rounded-full border border-blue-500/30">
                      {selectedDate}
                    </span>
                  </h3>
                  
                  <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2">
                    {selectedEmployee.timeLogs
                      .filter(log => log.date === selectedDate)
                      .map((log) => {
                        
                        // Get break sessions by type for this specific log date
                        const breakfastSessions = getBreakSessionsByType(selectedEmployee.breakLogs || [], 'breakfast')
                          .filter(b => b.startTime && new Date(b.startTime).toISOString().split('T')[0] === log.date);
                        
                        const lunchSessions = getBreakSessionsByType(selectedEmployee.breakLogs || [], 'lunch')
                          .filter(b => b.startTime && new Date(b.startTime).toISOString().split('T')[0] === log.date);
                        
                        const otherSessions = getBreakSessionsByType(selectedEmployee.breakLogs || [], 'other')
                          .filter(b => b.startTime && new Date(b.startTime).toISOString().split('T')[0] === log.date);
                        
                        return (
                          <div key={log._id} className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl p-6 border border-gray-700 hover:shadow-xl transition-all duration-200">
                            {/* Work Session Header */}
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h4 className="text-lg font-bold text-white mb-1">
                                  Work Session - {formatDateForHeader(log.date)}
                                </h4>
                                <div className="flex items-center gap-4 text-sm text-gray-300">
                                  <div className="flex items-center gap-1">
                                    <Clock size={14} />
                                    <span className="font-medium">First Start:</span>
                                    <span className="text-blue-300 ml-1">
                                      {log.firstStartTime ? formatTimeForDisplay(log.firstStartTime) : '-'}
                                    </span>
                                  </div>
                                  <div className="w-px h-4 bg-gray-700"></div>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium">Last Stop:</span>
                                    <span className="text-blue-300">
                                      {log.lastStopTime ? formatTimeForDisplay(log.lastStopTime) : 'Ongoing'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                                log.currentStatus === 'completed'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : log.currentStatus === 'working'
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                  : log.currentStatus?.includes('break')
                                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                                  : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                              }`}>
                                {log.currentStatus === 'completed' ? '✓ Completed' : 
                                 log.currentStatus === 'working' ? '⚡ Active' : 
                                 log.currentStatus?.includes('break') ? '⏸ On Break' : 
                                 'Inactive'}
                              </span>
                            </div>
                            
                            {/* Break Sessions by Type - Separated */}
                            <div className="mt-6">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Breakfast Breaks */}
                                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-600/10 p-4 rounded-xl border border-yellow-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{getBreakIcon('breakfast')}</span>
                                    <h5 className="font-bold text-white">Breakfast Breaks</h5>
                                    <span className="ml-auto px-2 py-1 bg-gradient-to-r from-yellow-500/20 to-orange-600/20 text-yellow-300 text-xs font-bold rounded-full border border-yellow-500/30">
                                      {breakfastSessions.length}
                                    </span>
                                  </div>
                                  {breakfastSessions.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                      {breakfastSessions.map((session, idx) => (
                                        <div key={idx} className="border-l-2 border-yellow-500 pl-2 py-2 bg-gray-900/30 rounded-r">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-gray-300">Start:</span>
                                            <span className="text-gray-300">{formatTimeForDisplay(session.startTime)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">End:</span>
                                            <span className="text-gray-300">{session.endTime ? formatTimeForDisplay(session.endTime) : 'Ongoing'}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">Duration:</span>
                                            <span className={`font-bold ${session.isActive ? 'animate-pulse text-yellow-400' : 'text-yellow-300'}`}>
                                              {session.duration}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 text-center py-4">No breakfast breaks</p>
                                  )}
                                </div>
                                
                                {/* Lunch Breaks */}
                                <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 p-4 rounded-xl border border-orange-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{getBreakIcon('lunch')}</span>
                                    <h5 className="font-bold text-white">Lunch Breaks</h5>
                                    <span className="ml-auto px-2 py-1 bg-gradient-to-r from-orange-500/20 to-red-600/20 text-orange-300 text-xs font-bold rounded-full border border-orange-500/30">
                                      {lunchSessions.length}
                                    </span>
                                  </div>
                                  {lunchSessions.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                      {lunchSessions.map((session, idx) => (
                                        <div key={idx} className="border-l-2 border-orange-500 pl-2 py-2 bg-gray-900/30 rounded-r">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-gray-300">Start:</span>
                                            <span className="text-gray-300">{formatTimeForDisplay(session.startTime)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">End:</span>
                                            <span className="text-gray-300">{session.endTime ? formatTimeForDisplay(session.endTime) : 'Ongoing'}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">Duration:</span>
                                            <span className={`font-bold ${session.isActive ? 'animate-pulse text-orange-400' : 'text-orange-300'}`}>
                                              {session.duration}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 text-center py-4">No lunch breaks</p>
                                  )}
                                </div>
                                
                                {/* Other Breaks */}
                                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-600/10 p-4 rounded-xl border border-purple-500/20">
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xl">{getBreakIcon('other')}</span>
                                    <h5 className="font-bold text-white">Other Breaks</h5>
                                    <span className="ml-auto px-2 py-1 bg-gradient-to-r from-purple-500/20 to-indigo-600/20 text-purple-300 text-xs font-bold rounded-full border border-purple-500/30">
                                      {otherSessions.length}
                                    </span>
                                  </div>
                                  {otherSessions.length > 0 ? (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                      {otherSessions.map((session, idx) => (
                                        <div key={idx} className="border-l-2 border-purple-500 pl-2 py-2 bg-gray-900/30 rounded-r">
                                          <div className="flex items-center justify-between text-xs">
                                            <span className="font-medium text-gray-300">Start:</span>
                                            <span className="text-gray-300">{formatTimeForDisplay(session.startTime)}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">End:</span>
                                            <span className="text-gray-300">{session.endTime ? formatTimeForDisplay(session.endTime) : 'Ongoing'}</span>
                                          </div>
                                          <div className="flex items-center justify-between text-xs mt-1">
                                            <span className="font-medium text-gray-300">Duration:</span>
                                            <span className={`font-bold ${session.isActive ? 'animate-pulse text-purple-400' : 'text-purple-300'}`}>
                                              {session.duration}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-sm text-gray-400 text-center py-4">No other breaks</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                           {/* Work Summary with Live Updates */}
                            <div className="mt-6 pt-4 border-t border-gray-700">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-4 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-xl border border-blue-500/20">
                                  <p className="text-sm text-gray-300 font-medium mb-1">Total Work Time</p>
                                  <p className="text-2xl font-bold text-blue-300">
                                    {(() => {
                                      const workMinutes = getLiveWorkMinutes(log);
                                      return formatTime(workMinutes * 60);
                                    })()}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Live updating
                                  </p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-xl border border-orange-500/20">
                                  <p className="text-sm text-gray-300 font-medium mb-1">Total Break Time</p>
                                  <p className="text-2xl font-bold text-orange-300">
                                    {(() => {
                                      const totalBreakSeconds = log.breakMinutes || 0;
                                      return formatTime(totalBreakSeconds);
                                    })()}
                                  </p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    Live updating
                                  </p>
                                </div>
                                <div className="text-center p-4 bg-gradient-to-br from-emerald-500/10 to-green-600/10 rounded-xl border border-emerald-500/20">
                                  <p className="text-sm text-gray-300 font-medium mb-1">Current Status</p>
                                  <p className={`text-lg font-bold ${
                                    log.currentStatus === 'working' ? 'text-emerald-300' : 
                                    log.currentStatus === 'stopped' ? 'text-red-300' : 
                                    log.currentStatus?.includes('break') ? 'text-orange-300' : 
                                    log.currentStatus === 'completed' ? 'text-blue-300' : 
                                    'text-gray-400'
                                  }`}>
                                    {log.status === 'working' ? 'Working' : 
                                     log.status === 'stopped' ? 'Not Started' : 
                                    log.status?.includes('break') ? 'On Break' : 
                                    log.status === 'completed' ? 'Completed' : 
                                    'Not Started'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    
                    {selectedEmployee.timeLogs.filter(log => log.date === selectedDate).length === 0 && (
                      <div className="text-center py-12">
                        <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg font-medium">No work history available for today</p>
                        <p className="text-gray-500 text-sm mt-2">
                          {selectedEmployee.user.name} hasn't logged any work sessions for {selectedDate}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-gray-400">
            <p>© {new Date().getFullYear()} TimeFlow. Enterprise Time Tracking Platform.</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                System Status: <span className="font-medium text-emerald-400">Operational</span>
              </span>
              <span className="flex items-center gap-1">
                <RefreshCw size={12} className="animate-spin" />
                Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out;
        }
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1f2937;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb {
          background: #4b5563;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default AdminDashboard;