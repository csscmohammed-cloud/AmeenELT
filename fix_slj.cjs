const fs = require('fs');
const sljPath = '/app/applet/src/components/StudentLearningJourney.tsx';
let slj = fs.readFileSync(sljPath, 'utf8');

// Remove handleSubmitJourney from top
slj = slj.replace(
  /  const { user } = useAuth\(\);\n  const \[submitted, setSubmitted\] = useState\(false\);\n\n  const handleSubmitJourney = async \(\) => \{[\s\S]*?\};\n\n/,
  `  const { user } = useAuth();\n  const [submitted, setSubmitted] = useState(false);\n\n`
);

// Add handleSubmitJourney right after quizScore declaration
slj = slj.replace(
  `  const [quizScore, setQuizScore] = useState<number | null>(null);`,
  `  const [quizScore, setQuizScore] = useState<number | null>(null);\n\n  const handleSubmitJourney = async () => {\n    if (!user) {\n      alert("Please sign in to submit assignments.");\n      return;\n    }\n    try {\n      await addDoc(collection(db, 'attempts'), {\n        userId: user.uid,\n        materialId: materialId || 'journey-' + Date.now(),\n        type: 'learning-journey',\n        score: quizScore || 90,\n        totalQuestions: 13,\n        status: 'completed',\n        completedAt: Date.now()\n      });\n      const userRef = doc(db, 'users', user.uid);\n      const userSnap = await getDoc(userRef);\n      if (userSnap.exists()) {\n        const userData = userSnap.data();\n        await updateDoc(userRef, {\n          xp: (userData.xp || 0) + 50,\n          points: (userData.points || 0) + 25\n        });\n      }\n      setSubmitted(true);\n      alert("🎉 Learning journey assignment successfully submitted to your instructor!");\n    } catch (err) {\n      console.error("Error submitting journey:", err);\n      alert("Failed to submit assignment. Please try again.");\n    }\n  };`
);

fs.writeFileSync(sljPath, slj);
console.log('Fixed StudentLearningJourney successfully.');
