import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { TeacherDashboard } from './TeacherDashboard';
import { StudentDashboard } from './StudentDashboard';

export function Dashboard() {
  const { profile } = useAuth();
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {profile?.role === 'teacher' ? <TeacherDashboard /> : <StudentDashboard />}
    </motion.div>
  );
}

