import { getFromUserStorage, setInUserStorage } from './storageUtils';

export const getIntegrations = () => {
  return getFromUserStorage<string[]>("connectedIntegrations") || [];
};

export const addIntegration = (name: string) => {
  const list = getIntegrations();
  if (!list.includes(name)) {
    setInUserStorage("connectedIntegrations", [...list, name]);
  }
};

export const removeIntegration = (name: string) => {
  const list = getIntegrations();
  const filtered = list.filter((item: string) => item !== name);
  setInUserStorage("connectedIntegrations", filtered);
};

export const isIntegrationConnected = (name: string) => {
  const list = getIntegrations();
  return list.includes(name);
};
