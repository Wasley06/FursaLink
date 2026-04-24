import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

const DISTRICTS = [
  'Mjini', 'Magharibi A', 'Magharibi B', 'Kaskazini A', 'Kaskazini B', 
  'Kati', 'Kusini', 'Mkoani', 'Chake Chake', 'Wete', 'Micheweni'
];

const OCCUPATIONS = [
  'Teacher', 'Radiologist', 'ICT Officer', 'Accountant', 'Software Engineer',
  'Civil Engineer', 'Doctor', 'Nurse', 'Marketing Specialist', 'Data Analyst'
];

const NAMES = [
  'Ali', 'Fatuma', 'Omar', 'Aisha', 'Mohammed', 'Zuwena', 'Said', 'Mwanahams', 'Juma', 'Khadija'
];

const LAST_NAMES = [
  'Haji', 'Hassan', 'Bakari', 'Shein', 'Juma', 'Ali', 'Othman', 'Suleiman', 'Mwinyi', 'Khamis'
];

export async function seedDemoCandidates(count: number = 300) {
  const usersRef = collection(db, 'users');
  const batchSize = 25;
  
  for (let i = 0; i < count; i++) {
    const firstName = NAMES[Math.floor(Math.random() * NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const district = DISTRICTS[Math.floor(Math.random() * DISTRICTS.length)];
    const occupation = OCCUPATIONS[Math.floor(Math.random() * OCCUPATIONS.length)];
    
    const candidateData = {
      fullName: `${firstName} ${lastName}`,
      phoneNumber: `077${Math.floor(1000000 + Math.random() * 9000000)}`,
      role: 'candidate',
      district,
      occupation,
      education: 'Bachelor Degree',
      profileProgress: Math.floor(Math.random() * 40) + 60,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDemo: true
    };
    
    await addDoc(usersRef, candidateData);
    console.log(`Seeded candidate ${i + 1}/${count}`);
  }
  
  return true;
}
