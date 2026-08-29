import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function deleteResource(id: string): Promise<void> {
  console.log('libraryService: Attempting to delete resource with id:', id);
  if (!id) {
    throw new Error('Resource ID is missing');
  }
  try {
    const docRef = doc(db, 'materials', id);
    await deleteDoc(docRef);
    console.log('libraryService: Successfully deleted resource');
  } catch (error) {
    console.error('Error deleting resource:', error);
    throw error;
  }
}
