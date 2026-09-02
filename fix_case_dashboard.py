import os

path = r'C:\Users\adity\OneDrive\Desktop\HealthChain-Live\src\features\dashboard\CaseDashboard.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the useEffect logic
old_logic = """    useEffect(() => {
      const profile = getProfile();
      const tasks: any[] = [];
      if (profile?.medications?.length) {
        profile.medications.forEach((m: any, i: number) => tasks.push({ id: 'med_'+i, title: m.name || m, subtitle: 'Scheduled Medication' }));
      }
      if (tasks.length === 0) {
        tasks.push({ id: 'task_default', title: 'Complete Health Profile', subtitle: 'Takes 2 mins' });
      }
      setDailyTasks(tasks);
    }, []);"""

new_logic = """    useEffect(() => {
      const profile = getProfile();
      const tasks: any[] = [];
      if (profile?.medications?.length) {
        profile.medications.forEach((m: any, i: number) => tasks.push({ id: 'med_'+i, title: m.name || m, subtitle: 'Scheduled Medication' }));
      }
      
      const isProfileIncomplete = !profile?.demographics?.dob || !profile?.demographics?.bloodGroup || !profile?.demographics?.gender;
      if (isProfileIncomplete) {
        tasks.push({ id: 'task_default', title: 'Complete Health Profile', subtitle: 'Earn 10 Vitality Points ✨' });
      } else if (tasks.length === 0) {
        tasks.push({ id: 'task_default_done', title: 'Health Profile Completed', subtitle: '10 Vitality Points Earned!' });
      }
      setDailyTasks(tasks);
    }, []);"""

content = content.replace(old_logic, new_logic)

# Fix the onClick logic
old_onclick = """            {dailyTasks.map(task => (
              <div key={task.id} onClick={() => task.id === 'task_2' && setShowFrictionModal(true)}>
                <CinematicCheckbox label={task.title} sublabel={task.subtitle} />
              </div>
            ))}"""

new_onclick = """            {dailyTasks.map(task => (
              <div key={task.id} onClick={() => {
                triggerHapticLight();
                if (task.id === 'task_2') setShowFrictionModal(true);
                if (task.id === 'task_default') navigate('/app/profile');
              }} style={{ cursor: task.id === 'task_default' ? 'pointer' : 'default' }}>
                <CinematicCheckbox label={task.title} sublabel={task.subtitle} checked={task.id === 'task_default_done'} />
              </div>
            ))}"""

content = content.replace(old_onclick, new_onclick)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated CaseDashboard to handle task_default correctly.")
