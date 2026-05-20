import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import type { Client } from '../../types/client';
import ClientModal from './ClientModal';


function ClientsSection() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Cargar clientes desde localStorage al montar el componente
  useEffect(() => {
    const saved = localStorage.getItem('plateaClients');
    if (saved) setClients(JSON.parse(saved));
  }, []);

  // Guardar clientes en localStorage cada vez que cambian
  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    localStorage.setItem('plateaClients', JSON.stringify(newClients));
  };
// Generar código para nuevo cliente
const getNextCode = () => {
  if (clients.length === 0) return 'CLI-00001';
  const maxNum = Math.max(...clients.map(c => parseInt(c.codi.split('-')[1])));
  return `CLI-${String(maxNum + 1).padStart(5, '0')}`;
};

// Generar código para nuevo contacto
const getNextContactCode = () => {
  let maxNum = 0;
  clients.forEach(c => {
    c.contactes?.forEach(cont => {
      const num = parseInt(cont.codi.split('-')[1]);
      if (num > maxNum) maxNum = num;
    });
  });
  return `CONT-${String(maxNum + 1).padStart(5, '0')}`;
};
  // Exportar clientes a Excel
const exportarExcel = () => {
  const data = clients.map(client => ({
    'Codi': client.codi,
    'Data Alta': client.dataAlta,
    'Nom Fiscal': client.nomFiscal,
    'Nom Comercial': client.nomComercial,
    'NIF': client.nif,
    'País': client.pais,
    'Telèfon': client.telefon,
    'Correu': client.correuElectronic,
    'Domicili': client.domicili,
    'Web': client.web,
    'Tipus IVA': client.tipusIVA,
    'Retenció IRPF': client.retencio
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients');
  
  const fileName = `clients-${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

  // Filtrar clientes por búsqueda y país
  const filteredClients = clients.filter(client => {
    return client.nomComercial.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nomFiscal.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.nif.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const deleteClient = (codi: string) => {
    saveClients(clients.filter(c => c.codi !== codi));
  };

  return (
    <div>
      {/* BARRA DE FILTROS Y ACCIONES */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Cercar client..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
          style={{ flex: '1', minWidth: '200px' }}
        />
        <button className="btn-secondary" onClick={exportarExcel}>Exportar Excel</button>
        <button className="btn-primary" onClick={() => setShowModal(true)}>
          Nou Client
        </button>
      </div>

      {/* TABLA DE CLIENTES */}
      <div className="placeholder-card">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
  <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Nom</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>NIF</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Correu</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Telèfon</th>
    <th style={{ textAlign: 'left', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase' }}>Web</th>
  </tr>
</thead>
<tbody>
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-text-tertiary)' }}>
                  No hi ha clients. Fes clic a "Nou Client" per afegir-ne un.
                </td>
              </tr>
            ) : (
              filteredClients.map((client) => (
                <tr 
  key={client.codi} 
  style={{ borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }} 
  className="table-row-hover"
  onClick={() => {
    setEditingClient(client);
    setShowModal(true);
  }}
>
<td 
  style={{ padding: '0.75rem', color: 'var(--color-accent-primary)', fontWeight: 500 }}
>
  {client.nomComercial}
</td>                  <td style={{ padding: '0.75rem' }}>{client.nif}</td>
                  <td style={{ padding: '0.75rem' }}>{client.correuElectronic}</td>
                  <td style={{ padding: '0.75rem' }}>{client.telefon}</td>
                  <td style={{ padding: '0.75rem' }}>
  {client.web ? (
    <a 
      href={client.web.startsWith('http') ? client.web : `https://${client.web}`}
      target="_blank" 
      rel="noopener noreferrer"
      style={{ color: 'var(--color-accent-primary)', textDecoration: 'none' }}
      onClick={(e) => e.stopPropagation()}
    >
      {client.web}
    </a>
  ) : (
    '-'
  )}
</td>                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

{/* MODAL DE CLIENTE - Crear nuevo o editar existente */}
{(showModal || editingClient) && (
  <ClientModal
  onClose={() => {
    setShowModal(false);
    setEditingClient(null);
    // Recargar clientes desde localStorage
    const saved = localStorage.getItem('plateaClients');
    setClients(saved ? JSON.parse(saved) : []);
  }}
    onSave={(client) => {
      // Verificar si el cliente ya existe (upsert)
      const existeix = clients.some(c => c.codi === client.codi);
      
      if (existeix) {
        // Actualizar cliente existente
        saveClients(clients.map(c => c.codi === client.codi ? client : c));
      } else {
        // Añadir nuevo cliente solo si no existe
        saveClients([...clients, client]);
      }
    }}
    onDelete={deleteClient}
    nextCode={getNextCode()}
    nextContactCode={getNextContactCode()}
    editingClient={editingClient}
  />
)}
    </div>
  );
}

export default ClientsSection;