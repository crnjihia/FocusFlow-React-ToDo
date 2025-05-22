import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Plus, Search, Filter, Archive, Moon, Sun, Download, Upload, 
  Play, Pause, RotateCcw, Bell, Tag, Calendar, CheckCircle2,
  Circle, Trash2, Edit3, Clock, AlertCircle, Star, 
  ChevronDown, ChevronRight, Mic, MicOff, Settings,
  Check, X, Grip, Info
} from 'lucide-react';

const TodoApp = () => {
  // State management
  const [tasks, setTasks] = useState([]);
  const [archivedTasks, setArchivedTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedPriority, setSelectedPriority] = useState('all');
  const [darkMode, setDarkMode] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [lastAction, setLastAction] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [timerTask, setTimerTask] = useState(null);
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [draggedTask, setDraggedTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const fileInputRef = useRef(null);
  const recognition = useRef(null);

  // Categories and priorities
  const categories = ['Work', 'Personal', 'Shopping', 'Health', 'Learning'];
  const priorities = ['Low', 'Medium', 'High'];

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      recognition.current = new window.webkitSpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = 'en-US';

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setNewTask(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = () => {
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Timer functionality
  useEffect(() => {
    let interval = null;
    if (timerActive && (timerMinutes > 0 || timerSeconds > 0)) {
      interval = setInterval(() => {
        if (timerSeconds > 0) {
          setTimerSeconds(timerSeconds - 1);
        } else if (timerMinutes > 0) {
          setTimerMinutes(timerMinutes - 1);
          setTimerSeconds(59);
        }
      }, 1000);
    } else if (timerActive && timerMinutes === 0 && timerSeconds === 0) {
      setTimerActive(false);
      if (timerTask) {
        showNotification('Timer completed!', `Task: ${timerTask.title}`);
      }
    }
    return () => clearInterval(interval);
  }, [timerActive, timerMinutes, timerSeconds, timerTask]);

  // Notification function
  const showNotification = (title, body) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
  };

  // Request notification permission
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Generate task ID
  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  // Add new task
  const addTask = () => {
    if (newTask.trim()) {
      const task = {
        id: generateId(),
        title: newTask.trim(),
        completed: false,
        category: 'Personal',
        priority: 'Medium',
        dueDate: '',
        createdAt: new Date().toISOString(),
        subtasks: [],
        recurring: 'none'
      };
      setTasks(prev => [...prev, task]);
      setNewTask('');
      setLastAction({ type: 'add', task });
    }
  };

  // Toggle task completion
  const toggleTask = (id) => {
    setTasks(prev => prev.map(task => {
      if (task.id === id) {
        const updatedTask = { ...task, completed: !task.completed };
        if (updatedTask.completed) {
          setLastAction({ type: 'complete', task: updatedTask });
        }
        return updatedTask;
      }
      return task;
    }));
  };

  // Delete task
  const deleteTask = (id) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks(prev => prev.filter(task => task.id !== id));
    setLastAction({ type: 'delete', task: taskToDelete });
  };

  // Update task
  const updateTask = (id, updates) => {
    setTasks(prev => prev.map(task => 
      task.id === id ? { ...task, ...updates } : task
    ));
  };

  // Archive completed tasks
  const archiveCompleted = () => {
    const completedTasks = tasks.filter(task => task.completed);
    setArchivedTasks(prev => [...prev, ...completedTasks]);
    setTasks(prev => prev.filter(task => !task.completed));
    setLastAction({ type: 'archive', tasks: completedTasks });
  };

  // Undo last action
  const undoLastAction = () => {
    if (!lastAction) return;

    switch (lastAction.type) {
      case 'delete':
        setTasks(prev => [...prev, lastAction.task]);
        break;
      case 'complete':
        setTasks(prev => prev.map(task => 
          task.id === lastAction.task.id 
            ? { ...task, completed: false }
            : task
        ));
        break;
      case 'archive':
        setTasks(prev => [...prev, ...lastAction.tasks]);
        setArchivedTasks(prev => prev.filter(t => 
          !lastAction.tasks.some(lt => lt.id === t.id)
        ));
        break;
    }
    setLastAction(null);
  };

  // Voice input
  const startVoiceInput = () => {
    if (recognition.current) {
      setIsListening(true);
      recognition.current.start();
    }
  };

  // Export tasks
  const exportTasks = () => {
    const data = { tasks, archivedTasks, settings: { darkMode } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import tasks
  const importTasks = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          if (data.tasks) setTasks(data.tasks);
          if (data.archivedTasks) setArchivedTasks(data.archivedTasks);
          if (data.settings?.darkMode !== undefined) setDarkMode(data.settings.darkMode);
        } catch (error) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    }
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || task.category === selectedCategory;
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority;
    return matchesSearch && matchesCategory && matchesPriority;
  });

  // Calculate progress
  const completedCount = tasks.filter(task => task.completed).length;
  const totalCount = tasks.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetTask) => {
    e.preventDefault();
    if (draggedTask && draggedTask.id !== targetTask.id) {
      const dragIndex = tasks.findIndex(t => t.id === draggedTask.id);
      const targetIndex = tasks.findIndex(t => t.id === targetTask.id);
      
      const newTasks = [...tasks];
      const [removed] = newTasks.splice(dragIndex, 1);
      newTasks.splice(targetIndex, 0, removed);
      
      setTasks(newTasks);
    }
    setDraggedTask(null);
  };

  // Check overdue tasks
  const isOverdue = (task) => {
    if (!task.dueDate) return false;
    return new Date(task.dueDate) < new Date() && !task.completed;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
    }`}>
      {/* Onboarding overlay */}
      {showOnboarding && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className={`max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex items-center mb-4">
              <Info className="w-6 h-6 text-blue-500 mr-2" />
              <h3 className="text-lg font-semibold">Welcome to Advanced Todo!</h3>
            </div>
            <p className="text-sm mb-4">
              This powerful todo app includes voice input, drag & drop, categories, 
              due dates, timer, and much more. Click around to explore!
            </p>
            <button
              onClick={() => setShowOnboarding(false)}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Get Started
            </button>
          </div>
        </div>
      )}

      <div className="container mx-auto max-w-4xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Advanced Todo List</h1>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={exportTasks}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-lg ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <Upload className="w-5 h-5" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={importTasks}
              className="hidden"
            />
          </div>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className={`mb-6 p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <h3 className="font-semibold mb-4">Settings & Export/Import</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`w-full p-2 rounded flex items-center justify-center space-x-2 ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}
                >
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span>{darkMode ? 'Dark' : 'Light'}</span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Export Tasks</label>
                <button
                  onClick={exportTasks}
                  className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center space-x-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Export JSON</span>
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Import Tasks</label>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>Import JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progress</span>
            <span className="text-sm">{completedCount}/{totalCount} tasks completed</span>
          </div>
          <div className={`w-full bg-gray-200 rounded-full h-2 ${darkMode ? 'bg-gray-700' : ''}`}>
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Timer Section */}
        {timerTask && (
          <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Pomodoro Timer</h3>
                <p className="text-sm opacity-75">Working on: {timerTask.title}</p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-2xl font-mono">
                  {String(timerMinutes).padStart(2, '0')}:{String(timerSeconds).padStart(2, '0')}
                </div>
                <button
                  onClick={() => setTimerActive(!timerActive)}
                  className={`p-2 rounded-lg ${timerActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white`}
                >
                  {timerActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    setTimerTask(null);
                    setTimerActive(false);
                    setTimerMinutes(25);
                    setTimerSeconds(0);
                  }}
                  className="p-2 rounded-lg bg-gray-500 hover:bg-gray-600 text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Task Form */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="flex space-x-2 mb-4">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                placeholder="Add a new task..."
                className={`w-full p-3 rounded-lg border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <button
              onClick={startVoiceInput}
              disabled={isListening}
              className={`p-3 rounded-lg ${
                isListening 
                  ? 'bg-red-500 animate-pulse' 
                  : 'bg-purple-500 hover:bg-purple-600'
              } text-white`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={addTask}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className={`mb-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search tasks..."
                className={`w-full pl-10 p-2 rounded border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                    : 'bg-white border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className={`p-2 rounded border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className={`p-2 rounded border ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="all">All Priorities</option>
              {priorities.map(pri => (
                <option key={pri} value={pri}>{pri}</option>
              ))}
            </select>
            <div className="flex space-x-2">
              <button
                onClick={archiveCompleted}
                className="flex-1 p-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center space-x-1"
              >
                <Archive className="w-4 h-4" />
                <span className="hidden sm:inline">Archive</span>
              </button>
              {lastAction && (
                <button
                  onClick={undoLastAction}
                  className="p-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={(e) => handleDragStart(e, task)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, task)}
              className={`p-4 rounded-lg border transition-all duration-200 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } ${task.completed ? 'opacity-60' : ''} ${
                isOverdue(task) ? 'border-red-500 border-l-4' : ''
              } hover:shadow-md cursor-move`}
            >
              <div className="flex items-center space-x-3">
                <Grip className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex-shrink-0 ${task.completed ? 'text-green-500' : 'text-gray-400'}`}
                >
                  {task.completed ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
                </button>
                
                <div className="flex-1">
                  {editingTask === task.id ? (
                    <input
                      type="text"
                      value={task.title}
                      onChange={(e) => updateTask(task.id, { title: e.target.value })}
                      onBlur={() => setEditingTask(null)}
                      onKeyPress={(e) => e.key === 'Enter' && setEditingTask(null)}
                      className={`w-full p-1 rounded ${
                        darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100'
                      } focus:outline-none`}
                      autoFocus
                    />
                  ) : (
                    <div>
                      <span className={`${task.completed ? 'line-through' : ''} ${
                        isOverdue(task) ? 'text-red-500' : ''
                      }`}>
                        {task.title}
                      </span>
                      <div className="flex items-center space-x-2 mt-1 text-xs">
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.priority === 'High' ? 'bg-red-100 text-red-800' :
                          task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {task.priority}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {task.category}
                        </span>
                        {task.dueDate && (
                          <span className={`flex items-center space-x-1 px-2 py-1 rounded text-xs ${
                            isOverdue(task) ? 'bg-red-100 text-red-800' : 
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setTimerTask(task);
                      setTimerMinutes(25);
                      setTimerSeconds(0);
                      setTimerActive(true);
                    }}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    title="Start Pomodoro Timer"
                  >
                    <Clock className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setEditingTask(task.id)}
                    className={`p-1 rounded ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className={`p-1 rounded text-red-500 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-gray-500">
              {tasks.length === 0 
                ? "Add your first task to get started!" 
                : "Try adjusting your filters or search term."
              }
            </p>
          </div>
        )}

        {/* Archived Tasks */}
        {archivedTasks.length > 0 && (
          <div className={`mt-8 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="flex items-center space-x-2 mb-4 text-sm font-medium"
            >
              {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Archive className="w-4 h-4" />
              <span>Archived Tasks ({archivedTasks.length})</span>
            </button>
            {showArchived && (
              <div className="space-y-2">
                {archivedTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded border opacity-60 ${
                      darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="line-through">{task.title}</span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {task.category} • {task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodoApp;