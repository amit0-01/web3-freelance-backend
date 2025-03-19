// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FreelancePlatform {
    struct Job {
        uint256 id;
        string title;
        uint256 payment;
        address employer;
        address freelancer;
        bool isCompleted;
    }

    Job[] public jobs;
    uint256 public nextJobId = 0;

    address public owner; // ✅ Owner for fund withdrawals

    event JobPosted(uint256 indexed id, string title, uint256 payment, address indexed employer);
    event JobCompleted(uint256 indexed id, address indexed freelancer);
    event PaymentReleased(uint256 indexed id, address indexed freelancer);

    constructor() {
        owner = msg.sender; // ✅ Initialize contract owner
    }

    function postJob(string memory title, uint256 payment) public payable {
        require(msg.value == payment, "Payment amount must match job payment");

        uint256 jobId = nextJobId;
        jobs.push(Job(jobId, title, payment, msg.sender, address(0), false));

        emit JobPosted(jobId, title, payment, msg.sender);
        nextJobId++;
    }

    function assignFreelancer(uint256 _jobId, address _freelancer) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer, "Not the employer");
        require(job.freelancer == address(0), "Freelancer already assigned");
        require(!job.isCompleted, "Cannot assign after job completion");

        job.freelancer = _freelancer;
    }

    function completeJob(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.freelancer, "Not the assigned freelancer");
        require(!job.isCompleted, "Job already completed");

        job.isCompleted = true;
        emit JobCompleted(_jobId, msg.sender);
    }

    function releasePayment(uint256 _jobId) external {
        Job storage job = jobs[_jobId];
        require(msg.sender == job.employer, "Not the employer");
        require(job.isCompleted, "Job not completed");
        require(job.payment > 0, "Job payment already released");

        uint256 paymentAmount = job.payment;
        job.payment = 0; // ✅ Prevent reentrancy

        emit PaymentReleased(_jobId, job.freelancer);
        payable(job.freelancer).transfer(paymentAmount); // ✅ Secure transfer
    }

    function getJobs() external view returns (Job[] memory) {
        return jobs;
    }

    function withdrawFunds(address payable _to, uint256 _amount) external {
        require(msg.sender == owner, "Only owner can withdraw");
        require(_amount <= address(this).balance, "Insufficient funds");

        _to.transfer(_amount);
    }

    receive() external payable {}
}
