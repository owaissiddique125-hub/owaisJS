import Constants from 'expo-constants';

const getGuardPassword = () => {
  return Constants.expoConfig?.extra?.guardpassword;
};

export default getGuardPassword;