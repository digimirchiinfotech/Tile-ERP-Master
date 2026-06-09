import { useState, useEffect } from 'react';
import { subscriptionService } from '../services/subscriptionService';
import RequestManager from '../utils/RequestManager';
import { tokenManager } from '../utils/tokenManager';
import { useAuthState } from './useAuthState';

export const useSubscriptions = () => {
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [companySubscriptions, setCompanySubscriptions] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isAuthenticated = useAuthState();

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await RequestManager.execute(() => subscriptionService.getAllPlans(), '/subscriptions/plans', 3);
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setSubscriptionPlans(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching plans:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanySubscriptions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getAllCompanySubscriptions();
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setCompanySubscriptions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching company subscriptions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch company subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getTransactions();
      const responseData = response?.data?.data || {};
      const data = Array.isArray(responseData) ? responseData : (responseData.data || []);
      setTransactions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = tokenManager.getAccessToken();
    if (token && isAuthenticated) {
      fetchPlans();
    }
  }, [isAuthenticated]);

  const createPlan = async (planData) => {
    try {
      const response = await subscriptionService.createPlan(planData);
      await fetchPlans();
      return response.data || response;
    } catch (err) {
      console.error('Error creating plan:', err);
      throw err;
    }
  };

  const updatePlan = async (id, planData) => {
    try {
      const response = await subscriptionService.updatePlan(id, planData);
      await fetchPlans();
      return response.data || response;
    } catch (err) {
      console.error('Error updating plan:', err);
      throw err;
    }
  };

  const deletePlan = async (id) => {
    try {
      await subscriptionService.deletePlan(id);
      await fetchPlans();
    } catch (err) {
      console.error('Error deleting plan:', err);
      throw err;
    }
  };

  const togglePlanStatus = async (id) => {
    try {
      await subscriptionService.togglePlanStatus(id);
      await fetchPlans();
    } catch (err) {
      console.error('Error toggling plan status:', err);
      throw err;
    }
  };

  const renewSubscription = async (id) => {
    try {
      await subscriptionService.renewSubscription(id);
      await fetchCompanySubscriptions();
    } catch (err) {
      console.error('Error renewing subscription:', err);
      throw err;
    }
  };

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await subscriptionService.getAnalytics();
      return response?.data?.data;
    } catch (err) {
      console.error('Error fetching subscription analytics:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateSubscription = async (id, data) => {
    try {
      const response = await subscriptionService.updateSubscription(id, data);
      await fetchCompanySubscriptions();
      return response?.data;
    } catch (err) {
      console.error('Error updating subscription:', err);
      throw err;
    }
  };

  return { 
    subscriptionPlans, 
    companySubscriptions,
    setCompanySubscriptions,
    transactions,
    loading, 
    error, 
    fetchPlans, 
    fetchCompanySubscriptions,
    fetchTransactions,
    createPlan, 
    updatePlan, 
    deletePlan,
    togglePlanStatus,
    renewSubscription,
    updateSubscription,
    fetchAnalytics
  };
};
