import { useNavigate } from "react-router-dom";
import AdOnboarding from "../components/onboarding/AdOnboarding";
import { useAuth } from "../context/AuthContext";

export default function AdOnboardingPage() {
	const navigate = useNavigate();
	const { user } = useAuth();

	return (
		<AdOnboarding
			variant='guest'
			user={user}
			onGoLogin={() => navigate("/login")}
			onGoRegister={() => navigate("/register")}
		/>
	);
}
