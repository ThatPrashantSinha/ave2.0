import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './tabs/Dashboard';
import { Planner } from './tabs/Planner';
import { Progress } from './tabs/Progress';
import { Focus } from './tabs/Focus';
import { useStore } from './store';
import { DataManagementModal } from './components/DataManagementModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const { tasks, habits, addTask, toggleTaskStatus, deleteTask, updateTask, refreshStore } = useStore();

  return (
    <div className="min-h-screen w-full bg-paper flex flex-col overflow-x-hidden p-6 md:p-10 pb-24 md:pb-10 relative box-border">
        <Header 
          onManageData={() => setIsManageModalOpen(true)} 
          showClosePage={currentTab !== 'dashboard'}
          onClosePage={() => setCurrentTab('dashboard')}
        />
        
        {currentTab === 'dashboard' && <Dashboard tasks={tasks} habits={habits} toggleTask={toggleTaskStatus} />}
        {currentTab === 'planner' && <Planner tasks={tasks} addTask={addTask} toggleTask={toggleTaskStatus} deleteTask={deleteTask} updateTask={updateTask} />}
        {currentTab === 'focus' && <Focus />}
        {currentTab === 'progress' && <Progress tasks={tasks} habits={habits} />}
        
        <Navigation currentTab={currentTab} setTab={setCurrentTab} />

        <DataManagementModal 
          isOpen={isManageModalOpen}
          onClose={() => setIsManageModalOpen(false)}
          tasks={tasks}
          habits={habits}
          onRefresh={refreshStore}
        />
    </div>
  );
}
