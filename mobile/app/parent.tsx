// The parent portal is hosted by the same Expo application and shares the
// Supabase session with the student mobile experience. Its own provider keeps
// parent-specific profile/linking state separate from learner state.
import ParentPortal from "../../parent-mobile/App";

export default ParentPortal;
