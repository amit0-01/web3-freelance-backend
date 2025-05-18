// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract JobEscrow {
    enum Status { Pending, Funded, Released, Refunded }

    struct Job {
        address client;
        address freelancer;
        uint256 amount;
        Status status;
    }

    mapping(uint256 => Job) public jobs;
    uint256 public jobCount;

    event JobCreated(uint256 indexed jobId, address client, address freelancer, uint256 amount);
    event PaymentDeposited(uint256 indexed jobId, uint256 amount);
    event PaymentReleased(uint256 indexed jobId, address freelancer);
    event PaymentRefunded(uint256 indexed jobId, address client);

    modifier onlyClient(uint256 jobId) {
        require(msg.sender == jobs[jobId].client, "Not the client");
        _;
    }

    modifier onlyFunded(uint256 jobId) {
        require(jobs[jobId].status == Status.Funded, "Not funded");
        _;
    }

    function createJob(address _freelancer) external payable returns (uint256) {
        require(msg.value > 0, "Must send ETH to fund job");
        uint256 jobId = ++jobCount;

        jobs[jobId] = Job({
            client: msg.sender,
            freelancer: _freelancer,
            amount: msg.value,
            status: Status.Funded
        });

        emit JobCreated(jobId, msg.sender, _freelancer, msg.value);
        emit PaymentDeposited(jobId, msg.value);
        return jobId;
    }

    function releasePayment(uint256 jobId) external onlyClient(jobId) onlyFunded(jobId) {
        Job storage job = jobs[jobId];
        job.status = Status.Released;

        (bool sent, ) = job.freelancer.call{value: job.amount}("");
        require(sent, "Payment failed");

        emit PaymentReleased(jobId, job.freelancer);
    }

    function refundPayment(uint256 jobId) external onlyClient(jobId) onlyFunded(jobId) {
        Job storage job = jobs[jobId];
        job.status = Status.Refunded;

        (bool sent, ) = job.client.call{value: job.amount}("");
        require(sent, "Refund failed");

        emit PaymentRefunded(jobId, job.client);
    }

    function getJob(uint256 jobId) external view returns (Job memory) {
        return jobs[jobId];
    }
}
