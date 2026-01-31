import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Coffee, Utensils, PlayCircle, StopCircle, Pause, 
  BarChart3, CheckCircle, Calendar, Filter, User, Timer, 
  TrendingUp, AlertTriangle, XCircle, RefreshCw, Shield,
  BarChart, PieChart, X, Download, Eye, CalendarDays, Sparkles,
  Monitor, Zap, Bell, BellRing
} from 'lucide-react';

/**
 * Employee Dashboard Component with Enhanced Electron Integration
 * Main interface for employees to track work hours, manage breaks, and view attendance
 */
const EmployeeDashboard = () => {
  // ===================== STATE DECLARATIONS =====================
  
  // User and Authentication States
  const [user, setUser] = useState(null);                    // Current logged-in user data
  const [todayLog, setTodayLog] = useState(null);           // Today's work time log
  const [activeBreak, setActiveBreak] = useState(null);     // Currently active break session
  
  // Timer and Time Tracking States
  const [timer, setTimer] = useState('00:00:00');           // Main work timer display
  const [breakTimer, setBreakTimer] = useState('00:00');    // Break timer display
  const [lastActivity, setLastActivity] = useState(Date.now()); // Last user activity timestamp
  const [totalWorkSeconds, setTotalWorkSeconds] = useState(0);  // Total work seconds for today
  
  // Data Collection States
  const [myLogs, setMyLogs] = useState([]);                 // All work logs for current user
  const [myAttendance, setMyAttendance] = useState([]);     // All attendance records
  const [todayAttendance, setTodayAttendance] = useState(null); // Today's attendance record
  const [todayBreaks, setTodayBreaks] = useState([]);       // Today's break sessions
  const [logBreaks, setLogBreaks] = useState({});           // Break logs organized by date
  const [loadingBreaks, setLoadingBreaks] = useState({});   // Loading states for break data
  
  // Break Time Tracking States
  const [breakfastTime, setBreakfastTime] = useState(0);    // Total breakfast break minutes
  const [lunchTime, setLunchTime] = useState(0);           // Total lunch break minutes
  const [otherBreakTime, setOtherBreakTime] = useState(0); // Total other break minutes
  const [breakOverTime, setBreakOverTime] = useState(false); // Overtime flag for breaks
  const [breakOverTimeType, setBreakOverTimeType] = useState(''); // Type of break in overtime
  
  // UI and Modal States
  const [showStats, setShowStats] = useState(false);       // Toggle for statistics view
  const [showLeaveForm, setShowLeaveForm] = useState(false); // Leave request form visibility
  const [showInactivityPopup, setShowInactivityPopup] = useState(false); // Inactivity warning popup
  const [showDayDetailPopup, setShowDayDetailPopup] = useState(false); // Day detail popup visibility
  
  // Leave Request Form States
  const [leaveNotes, setLeaveNotes] = useState('');         // Notes for leave request
  const [selectedLeaveType, setSelectedLeaveType] = useState(''); // Selected leave type
  const [selectedTimeSlot, setSelectedTimeSlot] = useState('');  // Selected time slot for leave
  
  // Filter and Data Display States
  const [filterMonth, setFilterMonth] = useState('all');    // Month filter for attendance history
  const [selectedLogDate, setSelectedLogDate] = useState(null); // Selected date for detailed view
  
  // Day Detail View States
  const [dayBreakdownData, setDayBreakdownData] = useState([]); // Time breakdown for selected day
  const [dayChartData, setDayChartData] = useState([]);     // Chart data for selected day
  
  // Pagination States for Attendance History
  const [currentPage, setCurrentPage] = useState(1);        // Current page number
  const [itemsPerPage, setItemsPerPage] = useState(5);      // Items per page in attendance table
  
  // Electron-specific States
  const [isElectron, setIsElectron] = useState(false);      // Check if running in Electron
  const [electronPlatform, setElectronPlatform] = useState(null); // Platform (win32, darwin, linux)
  
  // Derived State Variables
  const isWorking = !!todayLog?.startTime;                  // Check if currently working
  const onBreak = activeBreak?.startTime && !activeBreak?.endTime; // Check if currently on break
  
  // Refs for Timeout Management
  const inactivityTimeoutRef = useRef(null);               // Timeout reference for inactivity popup
  const breakWarned = useRef(false);                      // Track if break warning was shown
  
  // API Configuration
  const API_URL = 'http://localhost:5000/api';             // Base URL for backend API

  // ===================== ENHANCED NOTIFICATION FUNCTIONS =====================

  /**
   * Show enhanced system notification with app logo
   */
  const showEnhancedNotification = (title, body, type = 'info', options = {}) => {
    // Determine icon and styling based on type
    const notificationTypes = {
      success: {
        icon: '✅',
        urgency: 'normal',
      },
      warning: {
        icon: '⚠️',
        urgency: 'critical',
      },
      error: {
        icon: '❌',
        urgency: 'critical',
      },
      info: {
        icon: 'ℹ️',
        urgency: 'normal',
      },
      timer: {
        icon: '⏰',
        urgency: 'normal',
      },
      break: {
        icon: '☕',
        urgency: 'normal',
      },
      attendance: {
        icon: '📅',
        urgency: 'normal',
      }
    };

    const config = notificationTypes[type] || notificationTypes.info;
    
    // Prepare notification data
    const notificationData = {
      title: `${config.icon} ${title}`,
      body: body,
      urgency: options.urgency || config.urgency,
      silent: options.silent || false,
      timeout: options.timeout || (type === 'critical' ? 10000 : 5000),
      ...options
    };

    if (window.electronAPI) {
      // Use rich notification API
      window.electronAPI.showRichNotification(notificationData);
    } else {
      // Fallback to browser notifications
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(notificationData.title, {
          body: notificationData.body,
          icon: '/icon.png',
          tag: `timeflow-${type}-${Date.now()}`,
          requireInteraction: notificationData.urgency === 'critical',
          silent: notificationData.silent
        });
      } else if (Notification.permission === 'default') {
        // Request permission if not yet asked
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(notificationData.title, {
              body: notificationData.body,
              icon: '/icon.png'
            });
          }
        });
      }
    }
  };

  /**
   * Show timer-related notification with progress
   */
  const showTimerNotification = (action, duration = null) => {
    const messages = {
      start: { 
        title: 'Timer Started', 
        body: 'Work timer is now running! 🚀',
        type: 'timer'
      },
      stop: { 
        title: 'Timer Stopped', 
        body: 'Work timer has been stopped.',
        type: 'timer'
      },
      break_start: { 
        title: 'Break Started', 
        body: 'Enjoy your break! Take some time to recharge. ☕',
        type: 'break'
      },
      break_end: { 
        title: 'Break Ended', 
        body: 'Break time is over! Back to work! 💪',
        type: 'break'
      },
      break_warning: { 
        title: 'Break Time Warning', 
        body: 'Your break time is ending soon!',
        type: 'warning'
      },
      break_overtime: { 
        title: 'Break Overtime!', 
        body: 'You have exceeded your break time limit!',
        type: 'error'
      },
      auto_stop: { 
        title: 'Auto-Stop', 
        body: 'Timer auto-stopped after 19+ hours for your wellbeing.',
        type: 'warning'
      }
    };

    const message = messages[action] || { title: 'TimeFlow', body: 'Notification', type: 'info' };
    
    if (duration) {
      message.body += `\nDuration: ${formatMinutes(duration)}`;
    }

    showEnhancedNotification(message.title, message.body, message.type, {
      urgency: action.includes('overtime') || action.includes('warning') ? 'critical' : 'normal',
      timeout: action.includes('warning') || action.includes('overtime') ? 10000 : 5000
    });
  };

  /**
   * Show attendance-related notification
   */
  const showAttendanceNotification = (action, details = null) => {
    const messages = {
      present: { 
        title: 'Attendance Marked', 
        body: 'You have been marked present for today! 🎉',
        type: 'success'
      },
      leave_request: { 
        title: 'Leave Requested', 
        body: 'Your leave request has been submitted for approval.',
        type: 'info'
      },
      leave_approved: { 
        title: 'Leave Approved', 
        body: 'Your leave request has been approved! ✅',
        type: 'success'
      },
      leave_rejected: { 
        title: 'Leave Rejected', 
        body: 'Your leave request has been rejected.',
        type: 'error'
      }
    };

    const message = messages[action] || { title: 'Attendance', body: 'Notification', type: 'info' };
    
    if (details) {
      message.body += `\n${details}`;
    }

    showEnhancedNotification(message.title, message.body, message.type, {
      urgency: message.type === 'error' ? 'critical' : 'normal'
    });
  };

  /**
   * Show inactivity notification
   */
  const showInactivityNotification = (minutes) => {
    const notificationData = {
      title: '⚠️ Inactivity Alert',
      body: `No activity detected for ${minutes} minutes. Are you still working?`,
      urgency: 'critical',
      timeout: 30000,
      silent: false
    };

    // Add actions for macOS
    if (window.electronAPI?.platform === 'darwin') {
      notificationData.actions = [
        { type: 'button', text: 'Still Working' },
        { type: 'button', text: 'Stop Timer' }
      ];
    }

    showEnhancedNotification(notificationData.title, notificationData.body, 'warning', notificationData);
  };

  /**
   * Show daily summary notification
   */
  const showDailySummaryNotification = (workTime, breakTime) => {
    showEnhancedNotification(
      '📊 Daily Summary',
      `Great work today! 🎉\nWork: ${formatMinutes(workTime)}\nBreaks: ${formatMinutes(breakTime)}`,
      'success',
      {
        subtitle: 'TimeFlow Daily Report',
        timeout: 8000,
        urgency: 'normal'
      }
    );
  };

  /**
   * Test all notification types
   */
  const testNotifications = () => {
    showEnhancedNotification('Test Success', 'This is a success notification', 'success');
    showEnhancedNotification('Test Warning', 'This is a warning notification', 'warning');
    showEnhancedNotification('Test Error', 'This is an error notification', 'error');
    showEnhancedNotification('Test Info', 'This is an info notification', 'info');
    showTimerNotification('start');
    showTimerNotification('break_start');
    showAttendanceNotification('present');
  };

  // ===================== ELECTRON INTEGRATION =====================
  
  /**
   * Check if running in Electron and setup listeners
   */
  useEffect(() => {
    const checkElectronEnvironment = () => {
      const hasElectronAPI = !!window.electronAPI;
      setIsElectron(hasElectronAPI);
      
      if (hasElectronAPI) {
        console.log('🚀 Running in Electron Desktop App');
        setElectronPlatform(window.electronAPI.platform || 'unknown');
        
        // Setup Electron event listeners
        const handleInactivityFromSystem = () => {
          console.log('⚡ Inactivity detected from system monitor');
          setShowInactivityPopup(true);
          showInactivityNotification(15);
        };
        
        const handleRestartTimerCommand = () => {
          console.log('⚡ Restart timer command received from tray');
          handleStartWork();
        };
        
        const handleSystemActivity = (event) => {
          console.log('⚡ System activity detected:', event.type);
          // Update last activity when system detects activity
          setLastActivity(Date.now());
        };

        const handleNotificationAction = (data) => {
          console.log('Notification action clicked:', data);
          if (data.action.text === 'Still Working') {
            handleStillWorking();
          } else if (data.action.text === 'Stop Timer') {
            handleNotWorking();
          }
        };

        const handleTestNotifications = () => {
          console.log('Test notifications requested');
          testNotifications();
        };
        
        // Register listeners
        window.electronAPI.onInactivityDetected && window.electronAPI.onInactivityDetected(handleInactivityFromSystem);
        window.electronAPI.onRestartTimer && window.electronAPI.onRestartTimer(handleRestartTimerCommand);
        window.electronAPI.onSystemActivity && window.electronAPI.onSystemActivity(handleSystemActivity);
        window.electronAPI.onNotificationAction && window.electronAPI.onNotificationAction(handleNotificationAction);
        window.electronAPI.onTestNotifications && window.electronAPI.onTestNotifications(handleTestNotifications);
        
        // Cleanup function
        return () => {
          if (window.electronAPI.removeInactivityListener) {
            window.electronAPI.removeInactivityListener(handleInactivityFromSystem);
          }
          if (window.electronAPI.removeRestartTimerListener) {
            window.electronAPI.removeRestartTimerListener(handleRestartTimerCommand);
          }
          if (window.electronAPI.removeSystemActivityListener) {
            window.electronAPI.removeSystemActivityListener(handleSystemActivity);
          }
          if (window.electronAPI.removeNotificationActionListener) {
            window.electronAPI.removeNotificationActionListener(handleNotificationAction);
          }
        };
      } else {
        console.log('🌐 Running in browser mode');
      }
    };
    
    const cleanup = checkElectronEnvironment();
    return cleanup;
  }, []);
  
  /**
   * Send timer state to Electron main process
   */
  const sendTimerStateToElectron = (isRunning, additionalData = {}) => {
    if (window.electronAPI) {
      window.electronAPI.sendTimerState({
        isRunning,
        timestamp: Date.now(),
        workType: 'regular',
        ...additionalData
      });
    }
  };
  
  /**
   * Send user activity to Electron
   */
  const sendUserActivityToElectron = () => {
    if (window.electronAPI) {
      window.electronAPI.sendUserActivity();
    }
  };
  
  /**
   * Show system notification via Electron (legacy function)
   */
  const showSystemNotification = (title, body, type = 'info') => {
    showEnhancedNotification(title, body, type);
  };
  
  // ===================== EFFECT HOOKS =====================
  
  /**
   * Effect 1: Initialization on Component Mount
   */
  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    
    if (!userData || !userData.name) {
      fetchUserProfile();
    } else {
      setUser(userData);
    }
    
    if (token) {
      fetchAllData();
    }
  }, []);

  /**
   * Effect 2: Auto-Refresh Data
   */
  useEffect(() => {
    const fetchAllData = async () => {
      await Promise.all([
        fetchTodayLog(),
        fetchMyLogs(),
        fetchMyAttendance(),
        fetchTodayAttendance(),
        fetchTodayBreaks()
      ]);
    };

    fetchAllData();
    
    const interval = setInterval(fetchAllData, 5000);
    
    return () => clearInterval(interval);
  }, []);

  /**
   * Effect 3: Prepare Day Breakdown Data
   */
  useEffect(() => {
    if (selectedLogDate && myLogs.length > 0) {
      prepareDayBreakdownData(selectedLogDate);
    }
  }, [selectedLogDate, myLogs]);

  /**
   * Effect 4: Work Timer with Auto-Stop
   */
  useEffect(() => {
    let interval;
    
    if (todayLog?.startTime) {
      sendTimerStateToElectron(true);
      
      interval = setInterval(() => {
        const now = new Date();
        const runningSeconds = Math.floor((now - new Date(todayLog.startTime)) / 1000);
        const totalSeconds = Math.floor((todayLog.workMinutes || 0) * 60) + runningSeconds;
        
        if (totalSeconds >= 68400) {
          handleStopWork();
          showTimerNotification('auto_stop', totalSeconds);
          return;
        }
        
        setTotalWorkSeconds(totalSeconds);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        setTimer(`${pad(h)}:${pad(m)}:${pad(s)}`);
      }, 1000);
    } else {
      sendTimerStateToElectron(false, { reason: 'stopped' });
      
      const seconds = Math.floor((todayLog?.workMinutes || 0) * 60);
      setTotalWorkSeconds(seconds);
      setTimer(`${pad(Math.floor(seconds / 3600))}:${pad(Math.floor((seconds % 3600) / 60))}:${pad(seconds % 60)}`);
    }
    
    return () => clearInterval(interval);
  }, [todayLog]);

  /**
   * Effect 5: Break Timer with Overtime Detection
   */
  useEffect(() => {
    let interval;
    
    if (activeBreak?.startTime && !activeBreak?.endTime) {
      interval = setInterval(() => {
        const start = new Date(activeBreak.startTime);
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        const mins = Math.floor(diff / 60);
        const secs = diff % 60;
        setBreakTimer(`${pad(mins)}:${pad(secs)}`);
        
        // Define break time limits (in seconds)
        const breakLimit = {
          'breakfast': 20 * 60,
          'lunch': 60 * 60,
          'other': 30 * 60
        };
        
        // Check if break exceeds its time limit
        const limit = breakLimit[activeBreak.type] || 30 * 60;
        
        // Show warning at 80% of limit
        const warningThreshold = limit * 0.8;
        if (diff > warningThreshold && diff < warningThreshold + 60) {
          if (!breakWarned.current) {
            showTimerNotification('break_warning', diff);
            breakWarned.current = true;
          }
        }
        
        // Check for overtime
        if (diff > limit) {
          if (!breakOverTime) {
            setBreakOverTime(true);
            setBreakOverTimeType(activeBreak.type);
            showTimerNotification('break_overtime', diff);
          }
        } else {
          setBreakOverTime(false);
        }
      }, 1000);
    } else {
      setBreakOverTime(false);
      breakWarned.current = false;
    }
    
    return () => clearInterval(interval);
  }, [activeBreak]);

  /**
   * Effect 6: Inactivity Detection Setup
   */
  useEffect(() => {
    const updateActivity = () => {
      setLastActivity(Date.now());
      sendUserActivityToElectron();
    };
    
    window.addEventListener('mousemove', updateActivity);
    window.addEventListener('keydown', updateActivity);
    window.addEventListener('click', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('touchstart', updateActivity);
    
    return () => {
      window.removeEventListener('mousemove', updateActivity);
      window.removeEventListener('keydown', updateActivity);
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('touchstart', updateActivity);
    };
  }, []);

  /**
   * Effect 7: Inactivity Monitoring
   */
  useEffect(() => {
    if (!isWorking || onBreak) return;
    
    const interval = setInterval(() => {
      const now = Date.now();
      const diffMinutes = (now - lastActivity) / (1000 * 60);
      
      if (diffMinutes >= 15 && !showInactivityPopup) {
        setShowInactivityPopup(true);
        showInactivityNotification(15);
      }
    }, 10 * 1000);
    
    return () => clearInterval(interval);
  }, [lastActivity, isWorking, onBreak, showInactivityPopup]);

  /**
   * Effect 8: Inactivity Timeout Handler
   */
  useEffect(() => {
    if (!showInactivityPopup) return;
    
    inactivityTimeoutRef.current = setTimeout(async () => {
      await handleStopWork();
      setShowInactivityPopup(false);
      showEnhancedNotification(
        '⏹️ Timer Stopped',
        'Work timer stopped due to inactivity',
        'warning'
      );
    }, 60 * 1000);
    
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
        inactivityTimeoutRef.current = null;
      }
    };
  }, [showInactivityPopup]);

  /**
   * Effect 9: Daily summary notification at end of work
   */
  useEffect(() => {
    if (!isWorking && todayLog?.workMinutes && todayLog.workMinutes > 60) {
      const lastStopTime = new Date(todayLog.lastStopTime || new Date());
      const now = new Date();
      const diffMinutes = (now - lastStopTime) / (1000 * 60);
      
      if (diffMinutes < 5) {
        showDailySummaryNotification(
          todayLog.workMinutes,
          (todayLog.breakMinutes || 0)
        );
      }
    }
  }, [isWorking, todayLog]);

  // ===================== UTILITY FUNCTIONS =====================
  
  const pad = (num) => String(num).padStart(2, '0');

  const formatMinutes = (minutes) => {
    if (!minutes || minutes === 0) return '0m';
    if (minutes < 1) return `${Math.round(minutes * 60)}s`;
    if (minutes < 60) return `${Math.round(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatSeconds = (seconds) => {
    if (!seconds || seconds === 0) return '0s';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) {
      if (secs === 0) return `${mins}m`;
      return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    if (remainingMins === 0) return `${hours}h`;
    return `${hours}h ${remainingMins}m`;
  };

  const formatHoursMinutes = (totalMinutes) => {
    if (!totalMinutes || totalMinutes === 0) return '0m';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    
    if (hours === 0) return `${minutes}m`;
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}m`;
  };

  const formatTimeDisplay = (timeString) => {
    if (!timeString) return '--:--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatTimeDisplay24h = (timeString) => {
    if (!timeString) return '--:--';
    const date = new Date(timeString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDateDisplay = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // ===================== BREAK SESSION FUNCTIONS =====================
  
  const formatBreakSession = (breakSession) => {
    if (!breakSession.startTime) return null;
    
    const startTime = formatTimeDisplay(breakSession.startTime);
    const endTime = breakSession.endTime 
      ? formatTimeDisplay(breakSession.endTime)
      : 'In Progress';
      
    const duration = breakSession.minutes 
      ? formatMinutes(breakSession.minutes)
      : (breakSession.endTime 
          ? formatMinutes(Math.floor((new Date(breakSession.endTime) - new Date(breakSession.startTime)) / 60000))
          : 'Active');
          
    return {
      type: breakSession.type,
      startTime,
      endTime,
      duration,
      isActive: !breakSession.endTime,
      startDateTime: breakSession.startTime,
      endDateTime: breakSession.endTime
    };
  };

  // ===================== DATA PROCESSING FUNCTIONS =====================
  
  const prepareDayBreakdownData = (date) => {
    const selectedLog = myLogs.find(log => log.date === date);
    
    if (selectedLog) {
      const breakfastTotal = selectedLog.breakfastMinutes || 0;
      const lunchTotal = selectedLog.lunchMinutes || 0;
      const otherTotal = selectedLog.otherBreakMinutes || 0;
      const workTotal = selectedLog.workMinutes || 0;
      
      const breakdown = [
        { 
          name: 'Work Hours', 
          value: workTotal, 
          color: '#4F46E5',
          icon: Clock
        },
        { 
          name: 'Breakfast', 
          value: breakfastTotal, 
          color: '#F59E0B',
          icon: Coffee
        },
        { 
          name: 'Lunch', 
          value: lunchTotal, 
          color: '#EF4444',
          icon: Utensils
        },
        { 
          name: 'Other Breaks', 
          value: otherTotal, 
          color: '#8B5CF6',
          icon: Timer
        }
      ];
      
      setDayBreakdownData(breakdown);
      
      const chartData = breakdown.map(item => ({
        name: item.name,
        value: item.value,
        color: item.color
      }));
      setDayChartData(chartData);
    } else {
      setDayBreakdownData([]);
      setDayChartData([]);
    }
  };

  const fetchBreaksForDate = async (date) => {
    if (logBreaks[date]) {
      return logBreaks[date];
    }
    
    setLoadingBreaks(prev => ({ ...prev, [date]: true }));
    
    try {
      const data = await apiCall(`/employee/breaklogs?date=${date}`);
      setLogBreaks(prev => ({ ...prev, [date]: data }));
      return data;
    } catch (err) {
      console.error(err);
      return [];
    } finally {
      setLoadingBreaks(prev => ({ ...prev, [date]: false }));
    }
  };

  const handleDayClick = async (date) => {
    setSelectedLogDate(date);
    
    if (!logBreaks[date]) {
      await fetchBreaksForDate(date);
    }
    
    setShowDayDetailPopup(true);
  };

  // ===================== CHART RENDERING FUNCTIONS =====================
  
  const renderPieChart = () => {
    const totalTime = dayChartData.reduce((sum, item) => sum + item.value, 0);
    
    if (totalTime === 0) {
      return (
        <div className="text-center py-8">
          <PieChart size={40} className="mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No time data available</p>
        </div>
      );
    }

    let startAngle = 0;
    const radius = 60;
    const center = 70;
    
    return (
      <div className="relative">
        <svg width="100%" height="200" viewBox="0 0 140 140">
          {dayChartData.filter(item => item.value > 0).map((item, index) => {
            const angle = (item.value / totalTime) * 360;
            const endAngle = startAngle + angle;
            
            const startAngleRad = (startAngle - 90) * (Math.PI / 180);
            const endAngleRad = (endAngle - 90) * (Math.PI / 180);
            
            const x1 = center + radius * Math.cos(startAngleRad);
            const y1 = center + radius * Math.sin(startAngleRad);
            const x2 = center + radius * Math.cos(endAngleRad);
            const y2 = center + radius * Math.sin(endAngleRad);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
              `M ${center} ${center}`,
              `L ${x1} ${y1}`,
              `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
              `L ${center} ${center}`
            ].join(' ');
            
            const midAngle = startAngle + angle / 2 - 90;
            const midAngleRad = midAngle * (Math.PI / 180);
            const labelRadius = radius * 0.7;
            const labelX = center + labelRadius * Math.cos(midAngleRad);
            const labelY = center + labelRadius * Math.sin(midAngleRad);
            
            const segment = (
              <g key={index}>
                <path
                  d={pathData}
                  fill={item.color}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={labelX}
                  y={labelY}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight="bold"
                >
                  {((item.value / totalTime) * 100).toFixed(1)}%
                </text>
              </g>
            );
            
            startAngle = endAngle;
            return segment;
          })}
          
          <circle cx={center} cy={center} r={radius * 0.3} fill="white" />
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dy="5"
            fontSize="14"
            fill="#4B5563"
            fontWeight="bold"
          >
            {formatMinutes(totalTime)}
          </text>
        </svg>
      </div>
    );
  };

  // ===================== API FUNCTIONS =====================
  
  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await fetch(`${API_URL}/auth/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

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

  const fetchAllData = async () => {
    await Promise.all([
      fetchTodayLog(),
      fetchMyLogs(),
      fetchMyAttendance(),
      fetchTodayAttendance(),
      fetchTodayBreaks()
    ]);
  };

  const fetchTodayLog = async () => {
    try {
      const data = await apiCall('/time/today');
      setTodayLog(data);
      setActiveBreak(data.activeBreak || null);
      
      if (data) {
        setBreakfastTime(data.breakfastMinutes || 0);
        setLunchTime(data.lunchMinutes || 0);
        setOtherBreakTime(data.otherBreakMinutes || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyLogs = async () => {
    try {
      const data = await apiCall('/employee/timelogs');
      setMyLogs(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyAttendance = async () => {
    try {
      const data = await apiCall('/employee/attendance');
      setMyAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const data = await apiCall('/attendance/today');
      setTodayAttendance(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodayBreaks = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const data = await apiCall(`/employee/breaklogs?date=${today}`);
      
      let breakList = [];
      
      if (Array.isArray(data)) {
        breakList = data;
      } else if (data && data.breaks) {
        breakList = data.breaks;
      } else if (data && typeof data === 'object') {
        breakList = Object.values(data);
      }
      
      setTodayBreaks(breakList);
      
      let breakfast = 0, lunch = 0, other = 0;
      breakList.forEach(brk => {
        if (brk.type === 'breakfast') {
          breakfast += brk.minutes || 0;
        } else if (brk.type === 'lunch') {
          lunch += brk.minutes || 0;
        } else if (brk.type === 'other') {
          other += brk.minutes || 0;
        }
      });
      
      if (todayLog) {
        breakfast += todayLog.breakfastMinutes || 0;
        lunch += todayLog.lunchMinutes || 0;
        other += todayLog.otherBreakMinutes || 0;
      }
      
      setBreakfastTime(breakfast);
      setLunchTime(lunch);
      setOtherBreakTime(other);
    } catch (err) {
      console.error('Error fetching breaks:', err);
      setTodayBreaks([]);
    }
  };

  // ===================== WORK AND BREAK ACTION HANDLERS =====================
  
  const handleStartWork = async () => {
    try {
      await apiCall('/time/start', 'POST');
      await fetchAllData();
      showTimerNotification('start');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  const handleStopWork = async () => {
    try {
      await apiCall('/time/stop', 'POST');
      await fetchAllData();
      showTimerNotification('stop');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  const handleStartBreak = async (type) => {
    try {
      await apiCall('/time/break/start', 'POST', { type });
      await fetchAllData();
      showTimerNotification('break_start');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  const handleStopBreak = async () => {
    try {
      await apiCall('/time/break/stop', 'POST');
      await fetchAllData();
      showTimerNotification('break_end');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  const handleMarkPresent = async () => {
    try {
      await apiCall('/attendance/mark-present', 'POST');
      await fetchAllData();
      showAttendanceNotification('present');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  // ===================== LEAVE MANAGEMENT FUNCTIONS =====================
  
  const handleRequestLeave = async () => {
    if (!selectedLeaveType || !selectedTimeSlot) {
      showEnhancedNotification('Error', 'Please select leave type and time slot', 'error');
      return;
    }
    try {
      await apiCall('/attendance/request-leave', 'POST', { 
        leaveType: selectedLeaveType, 
        leaveTimeSlot: selectedTimeSlot,
        notes: leaveNotes 
      });
      setShowLeaveForm(false);
      setLeaveNotes('');
      setSelectedLeaveType('');
      setSelectedTimeSlot('');
      await fetchAllData();
      showAttendanceNotification('leave_request');
    } catch (err) {
      showEnhancedNotification('Error', err.message, 'error');
    }
  };

  // ===================== INACTIVITY HANDLING FUNCTIONS =====================
  
  const handleStillWorking = () => {
    setLastActivity(Date.now());
    setShowInactivityPopup(false);
    sendUserActivityToElectron();
    showEnhancedNotification('Timer Continues', 'Keep working! 👨‍💻', 'success');
    
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
  };

  const handleNotWorking = async () => {
    setShowInactivityPopup(false);
    showEnhancedNotification('Timer Stopped', 'Work timer stopped due to inactivity', 'warning');
    
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
      inactivityTimeoutRef.current = null;
    }
    
    await handleStopWork();
  };

  // ===================== ATTENDANCE HELPER FUNCTIONS =====================
  const hasMarkedPresent = todayAttendance?.markedPresent;
  const hasPendingLeave = todayAttendance?.leaveStatus === 'pending';
  const hasApprovedLeave = todayAttendance?.leaveStatus === 'approved';

  const getTimeSlotText = (slot) => {
    const slots = {
      "morning-half": "8:30 AM - 12:30 PM",
      "evening-half": "1:30 PM - 5:30 PM",
      "morning-short": "8:30 AM - 10:30 AM",
      "evening-short": "3:30 PM - 5:30 PM"
    };
    return slots[slot] || slot;
  };

  // ===================== FILTER AND PAGINATION FUNCTIONS =====================
  
  const getMonthsList = () => {
    const months = ['all'];
    myAttendance.forEach(att => {
      const month = att.date.substring(0, 7);
      if (!months.includes(month)) months.push(month);
    });
    return months.sort().reverse();
  };

  // ===================== PAGINATION CALCULATIONS =====================
  const filteredAttendance = filterMonth === 'all' 
    ? myAttendance 
    : myAttendance.filter(att => att.date.startsWith(filterMonth));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAttendanceItems = filteredAttendance.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAttendance.length / itemsPerPage);

  // ===================== RENDER COMPONENT =====================
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 mb-6 border border-gray-700/50">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Welcome, {user?.name || 'Loading...'}</h1>
                <p className="text-gray-300 mt-1 flex items-center gap-2 text-sm">
                  <Calendar size={16} />
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
                  })}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* Electron Status Badge */}
              {isElectron && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 rounded-lg border border-purple-500/30">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-medium text-emerald-400 flex items-center gap-1">
                    <Monitor size={12} />
                    Desktop App
                  </span>
                </div>
              )}
              
              {/* Notification Test Button */}
              {isElectron && (
                <button
                  onClick={testNotifications}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-xs font-medium border border-purple-500/30"
                  title="Test Notifications"
                >
                  <BellRing size={12} />
                  Test Notifications
                </button>
              )}
              
              <div className="text-xs text-gray-400 flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <RefreshCw size={12} className="animate-spin" />
                Auto-refresh 5s
              </div>
              
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-300 font-semibold text-sm border border-blue-500/30"
              >
                <BarChart3 size={18} />
                {showStats ? 'Hide Stats' : 'View Stats'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Content (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Timer Card */}
            <div className={`rounded-2xl shadow-xl p-8 text-white relative overflow-hidden border ${
              onBreak ? 'border-orange-500/30' : 
              breakOverTime ? 'border-red-500/30 animate-pulse' :
              'border-blue-500/30'
            }`}>
              <div className="absolute inset-0 bg-gradient-to-br ${
                onBreak ? 'from-orange-600/20 via-orange-700/20 to-red-700/20' : 
                breakOverTime ? 'from-red-600/20 via-red-700/20 to-rose-800/20' :
                'from-blue-600/20 via-indigo-700/20 to-purple-700/20'
              }"></div>
              
              {breakOverTime && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-red-500 to-rose-600 text-white px-3 py-2 rounded-lg flex items-center gap-2 animate-bounce border border-red-400/30">
                  <AlertTriangle size={16} />
                  <span className="font-bold text-sm">BREAK OVERTIME!</span>
                </div>
              )}
              
              {/* Electron Mode Indicator */}
              {isElectron && (
                <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-lg border border-blue-500/30">
                  <Zap size={12} className="text-blue-400" />
                  <span className="text-xs font-medium text-blue-300">System Monitoring Active</span>
                </div>
              )}
              
              <div className="text-center relative z-10">
                {onBreak ? (
                  <Pause className="w-16 h-16 mx-auto mb-4 opacity-90 animate-pulse" />
                ) : (
                  <Clock className="w-16 h-16 mx-auto mb-4 opacity-90" />
                )}
                
                <div className="mb-3">
                  <h2 className="text-5xl font-bold tracking-tight font-mono">{timer}</h2>
                  <div className="text-xs text-blue-300 mt-2">
                    {totalWorkSeconds >= 68400 ? '⚠️ Auto-stopped after 19h+' : ''}
                  </div>
                </div>
                
                <p className={`text-lg mb-8 ${onBreak ? 'text-orange-200' : 'text-blue-200'}`}>
                  {!isWorking && 'Ready to start work'}
                  {isWorking && !onBreak && '⚡ Working...'}
                  {onBreak && `⏸️ On ${activeBreak?.type || 'Break'} (Timer Paused)`}
                </p>
                
                <div className="flex gap-4 justify-center">
                  {!isWorking ? (
                    <button
                      onClick={handleStartWork}
                      className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 border border-emerald-500/30"
                    >
                      <PlayCircle size={20} />
                      Start Work
                    </button>
                  ) : (
                    <button
                      onClick={handleStopWork}
                      disabled={onBreak}
                      className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 rounded-xl font-bold text-base shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none transform hover:scale-105 border border-red-500/30"
                      title={onBreak ? 'End break first' : 'Stop work'}
                    >
                      <StopCircle size={20} />
                      Stop Work
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Break Timer Card - Only shows when on break */}
            {onBreak && (
              <div className={`bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border-2 ${breakOverTime ? 'border-red-500/30' : 'border-orange-500/30'}`}>
                <div className="text-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                    <Coffee className="text-white" size={24} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-white">Break Timer</h3>
                  <p className={`text-4xl font-bold mb-4 font-mono ${breakOverTime ? 'text-red-300' : 'text-orange-300'}`}>
                    {breakTimer}
                  </p>
                  
                  {breakOverTime && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-red-300 font-semibold text-sm flex items-center justify-center gap-2">
                        <AlertTriangle size={14} />
                        OVERTIME! {breakOverTimeType} break exceeded limit
                      </p>
                    </div>
                  )}
                  
                  <p className="text-gray-300 mb-4 capitalize text-base">
                    {activeBreak.type} Break in Progress
                  </p>
                  
                  <button
                    onClick={handleStopBreak}
                    className="px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-orange-500/30"
                  >
                    End Break & Resume Work
                  </button>
                </div>
              </div>
            )}

            {/* Break Controls - Only shows when working but not on break */}
            {isWorking && !onBreak && (
              <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700/50">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Coffee size={20} className="text-orange-400" />
                  Take a Break
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="group relative">
                    <button
                      onClick={() => handleStartBreak('breakfast')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-gray-800/70 to-gray-700/70 hover:from-gray-700/90 hover:to-gray-600/90 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-yellow-500/20"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Coffee size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-base">Breakfast</span>
                        <span className="text-xs opacity-90">20 min limit</span>
                      </div>
                    </button>
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-yellow-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                      {formatMinutes(breakfastTime)}
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <button
                      onClick={() => handleStartBreak('lunch')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-gray-800/70 to-gray-700/70 hover:from-gray-700/90 hover:to-gray-600/90 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-orange-500/20"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Utensils size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-base">Lunch</span>
                        <span className="text-xs opacity-90">60 min limit</span>
                      </div>
                    </button>
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                      {formatMinutes(lunchTime)}
                    </div>
                  </div>
                  
                  <div className="group relative">
                    <button
                      onClick={() => handleStartBreak('other')}
                      className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-gradient-to-br from-gray-800/70 to-gray-700/70 hover:from-gray-700/90 hover:to-gray-600/90 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border-2 border-purple-500/20"
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-lg flex items-center justify-center shadow-lg">
                        <Timer size={20} className="text-white" />
                      </div>
                      <div className="text-left">
                        <span className="block font-bold text-base">Other Break</span>
                        <span className="text-xs opacity-90">30 min limit</span>
                      </div>
                    </button>
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-xs px-2 py-1 rounded-full font-bold shadow-lg">
                      {formatMinutes(otherBreakTime)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Today's Summary Card */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-400" />
                  Today's Summary
                </h3>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-gray-400" />
                  <span className="font-semibold text-gray-300 text-sm">{user?.name || 'User'}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="bg-gradient-to-br from-blue-500/10 to-indigo-500/10 rounded-xl p-4 border border-blue-500/20">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Work Start</p>
                  <p className="text-base font-bold text-blue-300">
                    {formatTimeDisplay(todayLog?.firstStartTime)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 rounded-xl p-4 border border-cyan-500/20">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Work End</p>
                  <p className="text-base font-bold text-cyan-300">
                    {formatTimeDisplay(todayLog?.lastStopTime)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 rounded-xl p-4 border border-emerald-500/20">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Work Time</p>
                  <p className="text-base font-bold text-emerald-300">
                    {formatSeconds(totalWorkSeconds)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Total Breaks</p>
                  <p className="text-base font-bold text-purple-300">
                    {formatMinutes(todayLog?.breakMinutes || 0)}
                  </p>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                  <p className="text-xs text-gray-300 mb-1 font-medium">Status</p>
                  <p className={`text-base font-bold ${
                    todayAttendance?.presentStatus === 'present' || todayAttendance?.markedPresent ? 'text-emerald-300' :
                    todayAttendance?.presentStatus === 'late' ? 'text-yellow-300' :
                    'text-gray-300'
                  }`}>
                    {todayAttendance?.presentStatus === 'present' || todayAttendance?.markedPresent ? 'Present' :
                     todayAttendance?.presentStatus === 'late' ? 'Late' :
                     todayAttendance?.leaveStatus === 'approved' ? 'On Leave' : 'Absent'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 rounded-xl p-4 border border-yellow-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Coffee size={16} className="text-yellow-400" />
                      <p className="text-xs font-semibold text-gray-300">Breakfast</p>
                    </div>
                    <span className="text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-full font-medium border border-yellow-500/30">
                      20m limit
                    </span>
                  </div>
                  <p className="text-xl font-bold text-yellow-300 mb-1">{formatMinutes(breakfastTime)}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {breakfastTime >= 20 ? '⚠️ Limit reached' : `${formatMinutes(20 - breakfastTime)} remaining`}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-xl p-4 border border-orange-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Utensils size={16} className="text-orange-400" />
                      <p className="text-xs font-semibold text-gray-300">Lunch</p>
                    </div>
                    <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-1 rounded-full font-medium border border-orange-500/30">
                      60m limit
                    </span>
                  </div>
                  <p className="text-xl font-bold text-orange-300 mb-1">{formatMinutes(lunchTime)}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {lunchTime >= 60 ? '⚠️ Limit reached' : `${formatMinutes(60 - lunchTime)} remaining`}
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 rounded-xl p-4 border border-purple-500/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Timer size={16} className="text-purple-400" />
                      <p className="text-xs font-semibold text-gray-300">Other Breaks</p>
                    </div>
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded-full font-medium border border-purple-500/30">
                      30m limit
                    </span>
                  </div>
                  <p className="text-xl font-bold text-purple-300 mb-1">{formatMinutes(otherBreakTime)}</p>
                  <div className="text-xs text-gray-400 mt-2">
                    {otherBreakTime >= 30 ? '⚠️ Limit reached' : `${formatMinutes(30 - otherBreakTime)} remaining`}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Attendance & Leave & Charts (1/3 width) */}
          <div className="space-y-6">
            {/* Attendance & Leave Card */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-5 border border-gray-700/50 sticky top-6">
              <div className="flex items-center gap-2 mb-5">
                <Shield className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Attendance & Leave</h3>
              </div>
              
              <div className="space-y-4">
                {/* Mark Present Button */}
                {!hasMarkedPresent && !hasPendingLeave && !hasApprovedLeave && (
                  <button
                    onClick={handleMarkPresent}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-emerald-500/30"
                  >
                    <CheckCircle size={18} />
                    Mark Present Today
                  </button>
                )}
                
                {/* Current Status Display */}
                <div className={`p-4 rounded-xl border ${
                  hasMarkedPresent ? 'bg-emerald-500/10 border-emerald-500/20' :
                  hasApprovedLeave ? 'bg-blue-500/10 border-blue-500/20' :
                  hasPendingLeave ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-gray-800/50 border-gray-700/50'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {hasMarkedPresent && (
                      <>
                        <CheckCircle size={18} className="text-emerald-400" />
                        <span className="font-bold text-emerald-300 text-base">Present</span>
                      </>
                    )}
                    {hasApprovedLeave && (
                      <>
                        <CheckCircle size={18} className="text-blue-400" />
                        <span className="font-bold text-blue-300 text-base">Leave Approved</span>
                      </>
                    )}
                    {hasPendingLeave && (
                      <>
                        <Clock size={18} className="text-yellow-400" />
                        <span className="font-bold text-yellow-300 text-base">Leave Pending</span>
                      </>
                    )}
                    {!hasMarkedPresent && !hasPendingLeave && !hasApprovedLeave && (
                      <>
                        <XCircle size={18} className="text-gray-500" />
                        <span className="font-bold text-gray-400 text-base">Not Marked</span>
                      </>
                    )}
                  </div>
                  
                  {todayAttendance?.leaveType && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-300">
                        <span className="capitalize font-medium">{todayAttendance.leaveType}</span>
                        {todayAttendance.leaveTimeSlot && (
                          <span className="text-gray-400"> • {getTimeSlotText(todayAttendance.leaveTimeSlot)}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Request Leave Button */}
                {!hasPendingLeave && !hasApprovedLeave && (
                  <button
                    onClick={() => setShowLeaveForm(!showLeaveForm)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white rounded-xl font-semibold text-sm shadow-lg hover:shadow-xl transition-all duration-300 border border-orange-500/30"
                  >
                    <Calendar size={18} />
                    Request Leave
                  </button>
                )}
              </div>

              {/* Leave Request Form */}
              {showLeaveForm && (
                <div className="mt-5 p-4 bg-gradient-to-br from-gray-800/70 to-blue-500/10 rounded-xl border-2 border-gray-700/50">
                  <h4 className="font-bold mb-4 text-base text-white">Request Leave</h4>
                  
                  <div className="mb-4">
                    <label className="block text-xs font-semibold mb-2 text-gray-300">Leave Type</label>
                    <select
                      value={selectedLeaveType}
                      onChange={(e) => {
                        setSelectedLeaveType(e.target.value);
                        setSelectedTimeSlot('');
                      }}
                      className="w-full px-3 py-2 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-sm text-white"
                    >
                      <option value="" className="bg-gray-900">Select leave type</option>
                      <option value="half-day" className="bg-gray-900">Half Day</option>
                      <option value="short-leave" className="bg-gray-900">Short Leave</option>
                    </select>
                  </div>

                  {selectedLeaveType && (
                    <div className="mb-4">
                      <label className="block text-xs font-semibold mb-2 text-gray-300">Time Slot</label>
                      <select
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800/50 border-2 border-gray-700 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-sm text-white"
                      >
                        <option value="" className="bg-gray-900">Select time slot</option>
                        {selectedLeaveType === 'half-day' && (
                          <>
                            <option value="morning-half" className="bg-gray-900">Morning (8:30 AM - 12:30 PM)</option>
                            <option value="evening-half" className="bg-gray-900">Evening (1:30 PM - 5:30 PM)</option>
                          </>
                        )}
                        {selectedLeaveType === 'short-leave' && (
                          <>
                            <option value="morning-short" className="bg-gray-900">Morning (8:30 AM - 10:30 AM)</option>
                            <option value="evening-short" className="bg-gray-900">Evening (3:30 PM - 5:30 PM)</option>
                          </>
                        )}
                      </select>
                    </div>
                  )}

                  <textarea
                    value={leaveNotes}
                    onChange={(e) => setLeaveNotes(e.target.value)}
                    placeholder="Reason for leave (optional)"
                    className="w-full px-3 py-2 bg-gray-800/50 border-2 border-gray-700 rounded-xl mb-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all text-sm text-white placeholder-gray-500"
                    rows="3"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={handleRequestLeave}
                      className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-lg transition-all border border-blue-500/30"
                    >
                      Submit Request
                    </button>
                    <button
                      onClick={() => {
                        setShowLeaveForm(false);
                        setSelectedLeaveType('');
                        setSelectedTimeSlot('');
                        setLeaveNotes('');
                      }}
                      className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-xl hover:bg-gray-700/50 font-semibold text-sm transition-all border border-gray-700/50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stats Card */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-5 border border-gray-700/50 sticky top-6">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold text-white">Quick Stats</h3>
              </div>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-sm font-bold">This Month Attendance</span>
                  <span className="text-xl font-bold text-white">
                    {myAttendance.filter(a => a.presentStatus === 'present' || a.markedPresent).length} days
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-sm font-bold">Avg Work Hours</span>
                  <span className="text-xl font-bold text-white">
                    {myLogs.length > 0 
                      ? formatHoursMinutes(myLogs.reduce((sum, log) => sum + (log.workMinutes || 0), 0) / myLogs.length)
                      : '0h'
                    }
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-blue-300 text-sm font-bold">Total Breaks (Today)</span>
                  <span className="text-xl font-bold text-white">
                    {formatMinutes(breakfastTime + lunchTime + otherBreakTime)}
                  </span>
                </div>
              </div>

              {/* Break Sessions Section */}
              {todayBreaks.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h4 className="text-sm font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Coffee size={14} className="text-orange-400" />
                    Today's Break Sessions
                  </h4>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {todayBreaks.map((breakSession, index) => {
                      const formattedBreak = formatBreakSession(breakSession);
                      if (!formattedBreak) return null;
                      
                      return (
                        <div 
                          key={index} 
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            formattedBreak.isActive 
                              ? 'bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-500/20' 
                              : 'bg-gray-800/50 border border-gray-700/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              breakSession.type === 'breakfast' ? 'bg-yellow-500' :
                              breakSession.type === 'lunch' ? 'bg-orange-500' :
                              'bg-purple-500'
                            }`}>
                              {breakSession.type === 'breakfast' && <Coffee size={12} className="text-white" />}
                              {breakSession.type === 'lunch' && <Utensils size={12} className="text-white" />}
                              {breakSession.type === 'other' && <Timer size={12} className="text-white" />}
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-white capitalize">
                                {breakSession.type}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formattedBreak.startTime} → {formattedBreak.endTime}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-white">{formattedBreak.duration}</div>
                            <div className="text-xs text-gray-400">
                              {formattedBreak.isActive ? 'Active' : 'Completed'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats View - Only shows when stats are toggled on */}
        {showStats && (
          <div className="mt-8 space-y-6">
            {/* Recent Work Logs */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Clock size={20} className="text-blue-400" />
                  Recent Work Logs
                </h3>
                <div className="text-sm text-gray-400">
                  Last {Math.min(myLogs.length, 10)} days
                </div>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {myLogs.slice(0, 10).map((log, logIndex) => (
                  <div 
                    key={log._id} 
                    onClick={() => handleDayClick(log.date)}
                    className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl p-4 border border-gray-700 hover:border-blue-500/30 hover:shadow-sm transition-all duration-200 cursor-pointer hover:bg-gray-800/70"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-bold text-white text-base">
                          {new Date(log.date).toLocaleDateString('en-US', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{log.date}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-300">
                          {formatHoursMinutes(log.workMinutes || 0)}
                        </p>
                        <p className="text-xs text-gray-400">
                          Breaks: {formatMinutes(log.breakMinutes || 0)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-blue-300 font-medium flex items-center gap-1">
                      <Eye size={12} />
                      Click to view detailed breakdown
                    </div>
                  </div>
                ))}
                {myLogs.length === 0 && (
                  <div className="text-center py-12">
                    <Clock size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No work logs yet</p>
                  </div>
                )}
              </div>
            </div>

            {/* Attendance History with Pagination */}
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-2xl p-6 border border-gray-700/50">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Calendar size={20} className="text-blue-400" />
                  Attendance History
                </h3>
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-400" />
                  <select
                    value={filterMonth}
                    onChange={(e) => {
                      setFilterMonth(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="px-3 py-2 bg-gray-800/50 border-2 border-gray-700 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none text-white"
                  >
                    <option value="all" className="bg-gray-900">All Months</option>
                    {getMonthsList().slice(1).map(month => (
                      <option key={month} value={month} className="bg-gray-900">
                        {new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-bold text-gray-300">Date</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">Work Start</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">Work End</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">Work Hours</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">Status</th>
                      <th className="px-4 py-3 text-center text-sm font-bold text-gray-300">Leave Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {currentAttendanceItems.map((att) => {
                      const timeLog = myLogs.find(log => log.date === att.date);
                      
                      return (
                        <tr key={att._id} className="hover:bg-gray-800/30 transition-colors">
                          <td className="px-4 py-3 text-sm font-semibold text-white">
                            <div className="text-sm">
                              {new Date(att.date).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric', 
                                year: 'numeric' 
                              })}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(att.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-300">
                              {formatTimeDisplay24h(timeLog?.firstStartTime)}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium text-gray-300">
                              {formatTimeDisplay24h(timeLog?.lastStopTime)}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${
                              timeLog?.workMinutes >= 480 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              timeLog?.workMinutes >= 240 ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {timeLog?.workMinutes ? 
                                formatHoursMinutes(timeLog.workMinutes) : 
                                '--'
                              }
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                              att.presentStatus === 'present' || att.markedPresent ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                              att.presentStatus === 'late' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                              'bg-red-500/20 text-red-300 border border-red-500/30'
                            }`}>
                              {att.markedPresent ? 'Present' : 
                               att.presentStatus ? att.presentStatus.charAt(0).toUpperCase() + att.presentStatus.slice(1) : 
                               'Absent'}
                            </span>
                          </td>
                          
                          <td className="px-4 py-3 text-center">
                            {att.leaveType ? (
                              <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                                att.leaveStatus === 'approved' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' :
                                att.leaveStatus === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30' :
                                'bg-red-500/20 text-red-300 border border-red-500/30'
                              }`}>
                                {att.leaveType}
                              </span>
                            ) : (
                              <span className="text-gray-500 text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {filteredAttendance.length === 0 && (
                  <div className="text-center py-12">
                    <Calendar size={40} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">No attendance records</p>
                  </div>
                )}
              </div>

              {/* Pagination Controls */}
              {filteredAttendance.length > 0 && (
                <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-800">
                  <div className="text-sm text-gray-400">
                    Showing {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAttendance.length)} of {filteredAttendance.length} records
                  </div>
                  
                  <div className="flex gap-2">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-1 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white"
                    >
                      <option value="5" className="bg-gray-900">5 per page</option>
                      <option value="10" className="bg-gray-900">10 per page</option>
                      <option value="20" className="bg-gray-900">20 per page</option>
                      <option value="50" className="bg-gray-900">50 per page</option>
                    </select>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 bg-gray-800/50 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50 hover:text-white transition-colors border border-gray-700/50"
                    >
                      Previous
                    </button>
                    
                    <span className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium border border-blue-500/30">
                      {currentPage} / {totalPages || 1}
                    </span>
                    
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 bg-gray-800/50 text-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700/50 hover:text-white transition-colors border border-gray-700/50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Day Detail Popup */}
        {showDayDetailPopup && selectedLogDate && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-4xl w-full shadow-2xl max-h-[90vh] overflow-y-auto border border-gray-700">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                    <CalendarDays size={24} className="text-blue-400" />
                    {formatDateDisplay(selectedLogDate)}
                  </h3>
                  <p className="text-gray-300 mt-1">{selectedLogDate}</p>
                </div>
                <button
                  onClick={() => setShowDayDetailPopup(false)}
                  className="p-2 rounded-lg hover:bg-gray-700 transition-all"
                >
                  <X size={24} className="text-gray-400" />
                </button>
              </div>

              {/* Detailed Time Tracking */}
              <div className="mb-8">
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-blue-400" />
                  Detailed Time Tracking
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Work Time Details */}
                  <div className="bg-gradient-to-br from-blue-500/10 to-indigo-600/10 rounded-xl p-4 border border-blue-500/20">
                    <h5 className="font-bold text-blue-300 mb-3 flex items-center gap-2">
                      <Clock size={16} />
                      Work Sessions
                    </h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Total Work Time:</span>
                        <span className="font-bold text-blue-300">
                          {formatMinutes(dayBreakdownData.find(d => d.name === 'Work Hours')?.value || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Productive Hours:</span>
                        <span className="font-bold text-emerald-300">
                          {formatMinutes((dayBreakdownData.find(d => d.name === 'Work Hours')?.value || 0) * 0.85)}
                        </span>
                      </div>
                      <div className="w-full bg-blue-500/20 rounded-full h-2 overflow-hidden mt-2">
                        <div 
                          className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600" 
                          style={{ width: '85%' }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Break Details */}
                  <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 rounded-xl p-4 border border-orange-500/20">
                    <h5 className="font-bold text-orange-300 mb-3 flex items-center gap-2">
                      <Coffee size={16} />
                      Break Details
                    </h5>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-300">Total Breaks:</span>
                        <span className="font-bold text-orange-300">
                          {formatMinutes(
                            breakfastTime +
                            lunchTime +
                            otherBreakTime
                          )}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <div className="text-xs font-semibold text-yellow-300">Breakfast</div>
                          <div className="text-sm font-bold text-yellow-400">{formatMinutes(breakfastTime)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-orange-300">Lunch</div>
                          <div className="text-sm font-bold text-orange-400">{formatMinutes(lunchTime)}</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-purple-300">Other</div>
                          <div className="text-sm font-bold text-purple-400">{formatMinutes(otherBreakTime)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Break Sessions for Selected Day */}
              {logBreaks[selectedLogDate] && logBreaks[selectedLogDate].length > 0 && (
                <div className="mt-8 mb-8">
                  <h4 className="font-bold text-white mb-4 flex items-center gap-2">
                    <Coffee size={20} className="text-orange-400" />
                    Break Sessions for {selectedLogDate}
                  </h4>
                  <div className="space-y-3">
                    {logBreaks[selectedLogDate].map((breakSession, index) => {
                      const formattedBreak = formatBreakSession(breakSession);
                      if (!formattedBreak) return null;
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-xl border border-gray-700">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                              breakSession.type === 'breakfast' ? 'bg-yellow-500' :
                              breakSession.type === 'lunch' ? 'bg-orange-500' :
                              'bg-purple-500'
                            }`}>
                              {breakSession.type === 'breakfast' && <Coffee size={16} className="text-white" />}
                              {breakSession.type === 'lunch' && <Utensils size={16} className="text-white" />}
                              {breakSession.type === 'other' && <Timer size={16} className="text-white" />}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-white capitalize">{breakSession.type}</span>
                                {formattedBreak.isActive && (
                                  <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full font-bold animate-pulse border border-emerald-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-400">
                                {formattedBreak.startTime} → {formattedBreak.endTime}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-white">{formattedBreak.duration}</div>
                            <div className="text-xs text-gray-400">
                              {formattedBreak.isActive ? 'Active' : 'Completed'}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Time Summary */}
              <div className="bg-gradient-to-br from-gray-800/70 to-blue-500/10 rounded-xl p-4 border border-gray-700">
                <h4 className="font-bold text-white mb-3">Time Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Work vs Break Ratio</div>
                    <div className="text-xl font-bold text-white">
                      {dayBreakdownData.find(d => d.name === 'Work Hours')?.value > 0 ? 
                        Math.round((dayBreakdownData.find(d => d.name === 'Work Hours')?.value / dayBreakdownData.reduce((sum, d) => sum + d.value, 0)) * 100) : 0
                      }% Work
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Total Time Tracked</div>
                    <div className="text-xl font-bold text-blue-300">
                      {formatMinutes(dayBreakdownData.reduce((sum, d) => sum + d.value, 0))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm text-gray-300 mb-1">Break Efficiency</div>
                    <div className="text-xl font-bold text-emerald-300">
                      {dayBreakdownData.find(d => d.name === 'Work Hours')?.value > 0 ? 'Good' : 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowDayDetailPopup(false)}
                  className="px-4 py-2 bg-gray-800/50 text-gray-300 rounded-xl hover:bg-gray-700/50 font-semibold text-sm transition-all border border-gray-700/50"
                >
                  Close
                </button>
                <button
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-semibold text-sm shadow-lg transition-all flex items-center gap-2 border border-blue-500/30"
                >
                  <Download size={16} />
                  Export Report
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Inactivity Popup */}
        {showInactivityPopup && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center border border-gray-700">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Clock size={32} className="text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-white">Are you still working?</h3>
              <p className="text-gray-300 mb-6">
                {isElectron 
                  ? 'No activity detected for 15 minutes. System monitoring is active.'
                  : 'No activity detected for 15 minutes.'}
              </p>

              <div className="flex gap-4">
                <button
                  onClick={handleStillWorking}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 font-bold shadow-lg hover:shadow-xl transition-all border border-emerald-500/30"
                >
                  Yes, I am
                </button>
                <button
                  onClick={handleNotWorking}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-xl hover:from-red-700 hover:to-rose-700 font-bold shadow-lg hover:shadow-xl transition-all border border-red-500/30"
                >
                  No
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;