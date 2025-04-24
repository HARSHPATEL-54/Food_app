import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import GoogleLogo from "@/components/GoogleLogo";
import { LoginInputState, userLoginSchema } from "@/schema/userSchema";
import { useUserStore } from "@/store/useUserStore";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Login = () => {
  const [input, setInput] = useState<LoginInputState>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<Partial<LoginInputState>>({});
  const { loading, login, googleLogin, handleGoogleLoginSuccess } = useUserStore();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check for Google login success or error
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const googleLoginSuccess = urlParams.get('googleLoginSuccess');
    const error = urlParams.get('error');
    
    if (googleLoginSuccess === 'true') {
      handleGoogleLoginSuccess();
      navigate('/');
    }
    
    if (error) {
      toast.error(decodeURIComponent(error));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [location, handleGoogleLoginSuccess, navigate]);

  const changeEventHandler = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInput({ ...input, [name]: value });
  };
  const loginSubmitHandler = async (e: FormEvent) => {
    e.preventDefault();
    const result = userLoginSchema.safeParse(input);
    if (!result.success) {
      const fieldErrors = result.error.formErrors.fieldErrors;
      setErrors(fieldErrors as Partial<LoginInputState>);
      return;
    }
    try {
      await login(input);
      navigate("/");
    } catch (error) {console.log(error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form
        onSubmit={loginSubmitHandler}
        className="md:p-8 w-full max-w-md rounded-lg md:border border-gray-200 mx-4"
      >
        <div className="mb-4">
          <h1 className="font-bold text-2xl">Foodista</h1>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Input
              type="email"
              placeholder="Email"
              name="email"
              value={input.email}
              onChange={changeEventHandler}
              className="pl-10 focus-visible:ring-1"
            />
            <Mail className="absolute inset-y-2 left-2 text-gray-500 pointer-events-none" />
            {errors && (
              <span className="text-xs text-red-500">{errors.email}</span>
            )}
          </div>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Input
              type="password"
              placeholder="Password"
              name="password"
              value={input.password}
              onChange={changeEventHandler}
              className="pl-10 focus-visible:ring-1"
            />
            <LockKeyhole className="absolute inset-y-2 left-2 text-gray-500 pointer-events-none" />
            {errors && (
              <span className="text-xs text-red-500">{errors.password}</span>
            )}
          </div>
        </div>
        <div className="mb-10">
          {loading ? (
            <Button disabled className="w-full bg-orange hover:bg-hoverOrange">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Please wait
            </Button>
          ) : (
            <Button
              type="submit"
              className="w-full bg-orange hover:bg-hoverOrange"
            >
              Login
            </Button>
          )}
          <div className="mt-4">
            <Link
              to="/forgot-password"
              className="hover:text-blue-500 hover:underline"
            >
              Forgot Password
            </Link>
          </div>
        </div>
        <Separator className="my-4" />
        
        <Button 
          type="button" 
          onClick={() => googleLogin()} 
          className="w-full flex items-center justify-center bg-white hover:bg-gray-50 text-black border border-gray-300 py-2"
        >
          <GoogleLogo className="h-5 w-5 mr-2" />
          Sign in with Google
        </Button>
        
        <Separator className="my-4" />
        
        <p className="mt-2">
          Don't have an account?{" "}
          <Link to="/signup" className="text-blue-500">
            Signup
          </Link>
        </p>
      </form>
    </div>
  );
};

export default Login;