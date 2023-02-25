import { useToast } from '@chakra-ui/react';
import { Session, User } from '@supabase/supabase-js';
import { useContext, useState, useEffect, createContext } from 'react';
import { createOrVerifyProfile } from '../api/authApi';
import { supabaseClient } from '../config/supabase-client';

// create a context for authentication
const AuthContext = createContext<{ session: Session | null | undefined, user: User | null | undefined, signOut: () => void }>({ session: null, user: null, signOut: () => { } });

export const AuthProvider = ({ children }: any) => {
    const [user, setUser] = useState<User>()
    const [session, setSession] = useState<Session | null>();
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        const setData = async () => {
            const { data: { session }, error } = await supabaseClient.auth.getSession();
            if (error) throw error;
            setSession(session)
            setUser(session?.user)
            setLoading(false);
        };

        const { data: listener } = supabaseClient.auth.onAuthStateChange((_event, session) => {
            if (session?.user.app_metadata.provider === 'github') {
                // only with github we verify or create a new Profile
                createOrVerifyProfile(session.user.email!);
            }
            if (_event === 'SIGNED_OUT') {
                toast({
                    description: "Signed out",
                    status: "info"
                });
                localStorage.removeItem('user');
            }
            if (_event === 'SIGNED_IN') {
                toast({
                    description: "Signed in",
                    status: "info"
                });
            }
            setSession(session);
            setUser(session?.user)
            setLoading(false)
        });

        setData();

        return () => {
            listener?.subscription.unsubscribe();
        };
    }, [toast]);

    const value = {
        session,
        user,
        signOut: () => supabaseClient.auth.signOut(),
    };

    // use a provider to pass down the value
    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// export the useAuth hook
export const useAuth = () => {
    return useContext(AuthContext);
};

