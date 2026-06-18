import React, { useState } from 'react';
import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import { Dashboard } from './tabs/Dashboard';
import { Planner } from './tabs/Planner';
import { Progress } from './tabs/Progress';
import { Focus } from './tabs/Focus';
import { useStore } from './store';
import { DataManagementModal } from './components/DataManagementModal';
import { BirthdaysModal } from './components/BirthdaysModal';

export default function App() {
  const [currentTab, setCurrentTab] = useState('dashboard');
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isBirthdaysOpen, setIsBirthdaysOpen] = useState(false);
  const { 
    tasks, 
    habits, 
    birthdays, 
    addTask, 
    toggleTaskStatus, 
    deleteTask, 
    updateTask, 
    addBirthday, 
    deleteBirthday, 
    refreshStore 
  } = useStore();

  return (
    <div className="min-h-screen w-full bg-paper flex flex-col overflow-x-hidden p-6 md:p-10 pb-24 md:pb-10 relative box-border">
        <Header 
          onManageData={() => setIsManageModalOpen(true)} 
          showClosePage={currentTab !== 'dashboard'}
          onClosePage={() => setCurrentTab('dashboard')}
        />
        
        {currentTab === 'dashboard' && (
          <Dashboard 
            tasks={tasks} 
            habits={habits} 
            toggleTask={toggleTaskStatus} 
            birthdays={birthdays} 
          />
        )}
        {currentTab === 'planner' && (
          <Planner 
            tasks={tasks} 
            addTask={addTask} 
            toggleTask={toggleTaskStatus} 
            deleteTask={deleteTask} 
            updateTask={updateTask} 
            birthdays={birthdays}
            onOpenBirthdays={() => setIsBirthdaysOpen(true)}
          />
        )}
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

        <BirthdaysModal 
          isOpen={isBirthdaysOpen}
          onClose={() => setIsBirthdaysOpen(false)}
          birthdays={birthdays}
          addBirthday={addBirthday}
          deleteBirthday={deleteBirthday}
        />
    </div>
  );
}
