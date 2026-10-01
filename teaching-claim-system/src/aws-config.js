import { Amplify } from "aws-amplify";

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: "us-east-1_f58xVgKc3",
      userPoolClientId: "4p3t0bt0cng4k19bhtkn26lp6d",

      loginWith: {
        email: true,
      },
    },
  },
});