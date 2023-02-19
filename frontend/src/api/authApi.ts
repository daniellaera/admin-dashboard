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

export async function signInWithEmailAndPassword(email: string, password: string) {
  const { error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error;
  //const event = new CustomEvent("AuthStateChange", { detail: error });
  //window.dispatchEvent(event);
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

export async function addProfile(profile: Omit<Profile, 'id'>): Promise<Profile> {
  const { data } = await axios.post(profileUrl + '/create', profile);
  return data;
}

export async function updateProfile(profile: Profile) {
  const { data } = await axios.put(`${profileUrl}/updateById/${profile.id}`, profile);
  return data;
}


export async function fetchProfileByEmail(email: string): Promise<Profile> {
  const { data } = await axios.get(`${profileUrl}/findProfileByEmail/${email}`);
  return data;
}

export async function signOut() {
  /* return new Promise((resolve) => {
    setTimeout(() => {
      const event = new CustomEvent("AuthStateChange", { detail: undefined });
      window.dispatchEvent(event);
      resolve(true);
    }, 2000);
  }); */
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
