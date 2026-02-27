import { db } from "../config/firebase";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot } from "firebase/firestore";

export interface TeamMember {
  id?: string;
  email: string;
  role: "accountant" | "manager" | "employee";
  password?: string; // Hashed or stored temporarily
  createdBy: string; // Owner's email
  createdAt: string;
  name?: string;
}

const COLLECTION_NAME = "team_members";

export async function addTeamMember(member: TeamMember): Promise<string> {
  try {
    console.log("🔹 Adding team member:", {
      email: member.email,
      role: member.role,
      createdBy: member.createdBy,
      name: member.name
    });
    
    // Sanitize password: trim, remove all whitespace, normalize
    const sanitizedPassword = (member.password || "")
      .trim()
      .replace(/\s+/g, "")  // Remove all whitespace
      .normalize("NFKC");   // Normalize Unicode
    
    const docRef = await addDoc(collection(db, COLLECTION_NAME), {
      ...member,
      password: sanitizedPassword, // Store sanitized password
      createdAt: new Date().toISOString(),
    });
    console.log("✅ Team member added to Firestore:", {
      id: docRef.id,
      email: member.email,
      passwordLength: sanitizedPassword.length,
      collection: COLLECTION_NAME
    });
    return docRef.id;
  } catch (error) {
    console.error("❌ Error adding team member:", error);
    throw error;
  }
}

export async function getTeamMembers(ownerEmail: string): Promise<TeamMember[]> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("createdBy", "==", ownerEmail)
    );
    const snapshot = await getDocs(q);
    const members: TeamMember[] = [];
    snapshot.forEach(doc => {
      members.push({ id: doc.id, ...doc.data() } as TeamMember);
    });
    return members;
  } catch (error) {
    console.error("❌ Error fetching team members:", error);
    return [];
  }
}

/**
 * Subscribe to real-time updates of team members
 */
export function subscribeToTeamMembers(
  ownerEmail: string,
  callback: (members: TeamMember[]) => void
): () => void {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("createdBy", "==", ownerEmail)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const members: TeamMember[] = [];
      snapshot.forEach(doc => {
        members.push({ id: doc.id, ...doc.data() } as TeamMember);
      });
      callback(members);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error("❌ Error subscribing to team members:", error);
    return () => {};
  }
}

export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  try {
    const q = query(
      collection(db, COLLECTION_NAME),
      where("email", "==", email)
    );
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as TeamMember;
  } catch (error) {
    console.error("❌ Error fetching team member:", error);
    return null;
  }
}

export async function deleteTeamMember(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    console.log("✅ Team member deleted:", id);
  } catch (error) {
    console.error("❌ Error deleting team member:", error);
    throw error;
  }
}

/**
 * Authenticate employee against team_members collection
 * Employees are NOT in Firebase Auth, only in Firestore
 */
export async function authenticateEmployee(email: string, password: string): Promise<TeamMember | null> {
  try {
    console.log("🔹 Searching for employee:", email, "in collection:", COLLECTION_NAME);
    
    const q = query(
      collection(db, COLLECTION_NAME),
      where("email", "==", email)
    );
    const snapshot = await getDocs(q);
    
    console.log("🔹 Query result:", {
      email,
      found: !snapshot.empty,
      documentsCount: snapshot.size
    });
    
    if (snapshot.empty) {
      console.error("❌ Employee not found in Firestore:", email);
      console.log("   Collection name:", COLLECTION_NAME);
      return null;
    }
    
    const doc = snapshot.docs[0];
    const employee = { id: doc.id, ...doc.data() } as TeamMember;
    
    console.log("🔹 Employee found:", {
      id: doc.id,
      email: employee.email,
      role: employee.role,
      storedPassword: employee.password,
      providedPassword: password,
      passwordMatch: (employee.password?.trim() || "") === password.trim()
    });
    
    // Trim and normalize passwords - sanitize exactly like storage
    const storedPass = (employee.password || "")
      .trim()
      .replace(/\s+/g, "")  // Remove all whitespace
      .normalize("NFKC");   // Normalize Unicode
    
    const providedPass = password
      .trim()
      .replace(/\s+/g, "")  // Remove all whitespace
      .normalize("NFKC");   // Normalize Unicode
    
    console.log("🔍 Character comparison:", {
      storedLength: storedPass.length,
      providedLength: providedPass.length,
      storedCodes: Array.from(storedPass).map(c => c.charCodeAt(0)),
      providedCodes: Array.from(providedPass).map(c => c.charCodeAt(0)),
      directMatch: storedPass === providedPass,
      lowerCaseMatch: storedPass.toLowerCase() === providedPass.toLowerCase()
    });
    
    // Verify password matches (now with sanitization)
    if (storedPass === providedPass) {
      console.log("✅ Employee authenticated successfully:", email);
      return employee;
    } else {
      console.error("❌ Password mismatch for:", email);
      console.log("   Stored (sanitized):", `"${storedPass}"`, `(length: ${storedPass.length})`);
      console.log("   Provided (sanitized):", `"${providedPass}"`, `(length: ${providedPass.length})`);
      return null;
    }
  } catch (error) {
    console.error("❌ Error authenticating employee:", error);
    return null;
  }
}
