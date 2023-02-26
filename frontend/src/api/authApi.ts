import axios from "axios";
import { supabaseClient } from "../config/supabase-client";
import { AuthUser } from "../types/authUser";
import { Profile } from "../types/profile";

const profileUrl: string = `${process.env.REACT_APP_BACKEND_URL}/api/v1/profile`;

const authUser = {
  id: "123",
  email: "john@smith.com",
  firstName: "John",
  lastName: "Smith"
};

export async function fetchAuthUser(): Promise<AuthUser> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(authUser);
    }, 1000);
  });
}

/* export function onAuthStateChanged(callback: (authUser: AuthUser) => void) {
  const cb = (event: Event) => {
    const detail = (event as CustomEvent).detail;
    callback(detail);
    console.log('detail', detail)
  };
  window.addEventListener("AuthStateChange", cb);

  return () => window.removeEventListener("AuthStateChange", cb);
} */

export async function signInWithOAuth() {
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider: 'github',
  });
  if (error) throw error;
}

export async function signInWithMagicLink(email: string) {
  const { error } = await supabaseClient.auth.signInWithOtp({ email });
  if (error) throw error;
  const data: Omit<Profile, 'id'> = {
    authorEmail: email
  }
  await addProfile(data)
}

export async function signInWithEmailAndPassword(email: string, password: string) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error;
}

export const signUpWithEmailAndPassword = async (email: string, password: string) => {
  const { error } = await supabaseClient.auth.signUp({
    email,
    password
  })
  if (error) throw error;
  const data: Omit<Profile, 'id'> = {
    authorEmail: email
  }
  await addProfile(data)
}

export async function createOrVerifyProfile(email: string): Promise<Profile> {
  return await axios.post(`${profileUrl}/createProfileBySocial/${email}`);
}

export async function addProfile(profile: Omit<Profile, 'id'>): Promise<Profile> {
  const { data } = await axios.post(profileUrl + '/create', profile);
  return data;
}

export async function updateProfile(profile: Profile) {
  const { data } = await axios.put(`${profileUrl}/updateById/${profile.id}`, profile);
  return data;
}

export async function deleteProfileById(id: number): Promise<Profile> {
  const { data: { session } } = await supabaseClient.auth.getSession();

  const { data } = await axios.delete(`${profileUrl}/delete/${id}`, {
    headers: { Authorization: `token ${session?.access_token}` }
  });
  return data;
}

export async function fetchProfileByEmail(email: string): Promise<Profile> {
  const { data } = await axios.get(`${profileUrl}/findProfileByEmail/${email}`);
  return data;
}

export async function signOut() {
  const { error } = await supabaseClient.auth.signOut()
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 2000);
  });
}
