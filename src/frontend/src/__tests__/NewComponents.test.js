import { render, screen, fireEvent } from '@testing-library/react';
import ApplicationDetail from '../ApplicationDetail';
import CommandPalette from '../CommandPalette';

const sampleApp = {
  id: 7,
  applicantName: 'Ravi Kumar',
  age: 29,
  annualIncome: 480000,
  employmentType: 'SALARIED',
  mobileUsageScore: 72,
  transactionBehaviorScore: 64,
  socialSignalScore: 55,
  creditDecision: 'APPROVED',
  confidenceScore: 88,
  reasoning: 'Strong alternative-data profile with stable income.',
  fraudRisk: 'LOW',
  reviewStatus: 'PENDING_REVIEW',
  documentPath: '/uploads/probe.pdf',
  createdAt: new Date().toISOString(),
};

const sampleLogs = [
  { id: 1, applicationId: 7, decision: 'APPROVED', reasoning: 'Auto-approved by policy.', timestamp: new Date().toISOString() },
];

test('ApplicationDetail renders decision, viz and audit lineage without crashing', () => {
  render(<ApplicationDetail application={sampleApp} auditLogs={sampleLogs} onClose={() => {}} />);
  expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
  expect(screen.getAllByText('APPROVED').length).toBeGreaterThan(0);
  expect(screen.getByText(/Audit lineage/i)).toBeInTheDocument();
  expect(screen.getByText(/Where this goes next/i)).toBeInTheDocument();
});

test('CommandPalette opens, lists pages and applications, and fires navigation', () => {
  const onNavigate = jest.fn();
  const onOpenDetail = jest.fn();
  const onClose = jest.fn();
  render(
    <CommandPalette
      open
      onClose={onClose}
      applications={[sampleApp]}
      onNavigate={onNavigate}
      onOpenDetail={onOpenDetail}
    />
  );
  expect(screen.getByPlaceholderText(/Jump to a workspace/i)).toBeInTheDocument();
  expect(screen.getByText('Ravi Kumar')).toBeInTheDocument();
  fireEvent.click(screen.getByText('Command Center'));
  expect(onNavigate).toHaveBeenCalledWith('Command Center');
  fireEvent.click(screen.getByText('Ravi Kumar'));
  expect(onOpenDetail).toHaveBeenCalledWith(sampleApp);
});
