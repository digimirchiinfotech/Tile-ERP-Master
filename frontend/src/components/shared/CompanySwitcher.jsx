/**
 * TILE EXPORTER ERP SAAS
 * 
 * COPYRIGHT © 2026. ALL RIGHTS RESERVED.
 * 
 * PROPRIETARY AND CONFIDENTIAL:
 * This source code is the strictly confidential intellectual property of the 
 * Tile Exporter system. Unauthorized copying, modification, distribution, 
 * or reverse engineering of this file, via any medium, is strictly prohibited.
 */

import React, { useState, useEffect } from 'react';
import { Building2 } from 'lucide-react';
import { useUserContext } from '../../contexts/UserContext';
import axios from 'axios';
import './CompanySwitcher.css';

const CompanySwitcher = ({ onNavigate }) => {
  const { user, selectedCompanyId } = useUserContext();
  const [companyName, setCompanyName] = useState('Tile Exporter');

  useEffect(() => {
    // Super admins do not belong to a company
    let role = user?.role;
    if (!role) {
      try {
        const uStr = localStorage.getItem('current_user');
        if (uStr) role = JSON.parse(uStr).role;
      } catch(e) {}
    }
    if (role === 'super_admin') {
      setCompanyName('Super Admin');
      return;
    }
    let name = user?.company_name || user?.companyName;
    if (!name) {
      try {
        const uStr = localStorage.getItem('current_user');
        if (uStr) {
          const uObj = JSON.parse(uStr);
          name = uObj.company_name || uObj.companyName;
        }
      } catch (e) {}
    }
    if (name) setCompanyName(name);

    const fetchCompany = async () => {
      const cid = user?.company_id || user?.companyId || selectedCompanyId || localStorage.getItem('selected_company_id');
      if (cid) {
        try {
          const token = localStorage.getItem('access_token');
          if (token) {
            const res = await api.get(`/companies/${cid}`);
            if (res.data?.data?.name) {
              setCompanyName(res.data.data.name);
            }
          }
        } catch (e) {
          console.error("Failed to fetch company profile for company switcher");
        }
      }
    };
    fetchCompany();
    
    const handleUpdate = () => fetchCompany();
    window.addEventListener('companyProfileUpdated', handleUpdate);
    return () => window.removeEventListener('companyProfileUpdated', handleUpdate);
  }, [user, selectedCompanyId]);

  return (
    <div className="company-display-static">
      <Building2 size={16} />
      <span>{companyName}</span>
    </div>
  );
};

export default CompanySwitcher;
